import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const TABLES=["shops","users","customers","cars","service_items","quotations","construction_orders","appointments","payment","transaction_record","staff_info","staff_attendance","salary_records","receipt_records","system_settings","vehicle_models","role_permissions"];
const PAGE=1000;

async function readTable(table:string,tenantId:string){const admin=getSupabaseAdmin();const rows:Record<string,unknown>[]=[];for(let from=0;;from+=PAGE){const q=admin.from(table).select("*").eq("tenant_id",tenantId).range(from,from+PAGE-1);const {data,error}=await q;if(error){if(["42P01","42703"].includes(error.code||""))return [];throw error}rows.push(...(data||[]));if(!data||data.length<PAGE)break}return rows}
async function listFiles(prefix=""){const admin=getSupabaseAdmin();const out:{name:string;size:number}[]=[];const {data,error}=await admin.storage.from("car-images").list(prefix,{limit:1000});if(error)throw error;for(const item of data||[]){const path=prefix?`${prefix}/${item.name}`:item.name;if(item.id)out.push({name:path,size:Number(item.metadata?.size||0)});else out.push(...await listFiles(path))}return out}

type EnterpriseSnapshot={version:number;tenant_id:string;created_at:string;tables:Record<string,Record<string,unknown>[]>;storage_manifest?:{name:string;backup_path:string;size?:number}[]};

async function loadVerifiedSnapshot(input:{backupJobId:string;tenantId:string}){
  const admin=getSupabaseAdmin();
  const {data:job,error}=await admin.from("backup_jobs").select("provider_reference,status").eq("id",input.backupJobId).eq("tenant_id",input.tenantId).single();
  if(error||job?.status!=="completed"||!job.provider_reference)throw new Error("找不到可還原的完整備份。");
  const {data:artifact,error:artifactError}=await admin.from("backup_artifacts").select("checksum,size_bytes").eq("backup_job_id",input.backupJobId).eq("artifact_type","database_json").maybeSingle();
  if(artifactError)throw artifactError;
  if(!artifact?.checksum)throw new Error("備份缺少完整性校驗碼，禁止還原。");
  const {data,error:downloadError}=await admin.storage.from("system-backups").download(job.provider_reference);
  if(downloadError)throw downloadError;
  const body=await data.text();
  const checksum=createHash("sha256").update(body).digest("hex");
  if(checksum!==artifact.checksum)throw new Error("備份校驗失敗，檔案可能損毀或遭修改。");
  const snapshot=JSON.parse(body) as EnterpriseSnapshot;
  if(snapshot.tenant_id!==input.tenantId)throw new Error("備份租戶與目前租戶不符。");
  if(!snapshot.tables||typeof snapshot.tables!=="object")throw new Error("備份資料格式異常。");
  for(const table of TABLES)if(!Array.isArray(snapshot.tables[table]||[]))throw new Error(`備份資料表 ${table} 格式異常。`);
  return{snapshot,checksum,sizeBytes:Number(artifact.size_bytes||body.length)};
}

export async function verifyEnterpriseBackup(input:{backupJobId:string;tenantId:string}){
  const{snapshot,checksum,sizeBytes}=await loadVerifiedSnapshot(input);
  return{ok:true,checksum,size_bytes:sizeBytes,table_count:Object.keys(snapshot.tables).length,row_count:Object.values(snapshot.tables).reduce((sum,rows)=>sum+rows.length,0),photo_count:(snapshot.storage_manifest||[]).length,created_at:snapshot.created_at};
}

export async function runEnterpriseBackup(input:{jobId:string;tenantId:string}){const admin=getSupabaseAdmin();await admin.from("backup_jobs").update({status:"running",started_at:new Date().toISOString()}).eq("id",input.jobId);try{const tables:Record<string,unknown[]>={};for(const table of TABLES)tables[table]=await readTable(table,input.tenantId);const shopIds=(tables.shops||[]).map(x=>String((x as Record<string,unknown>).id||"")).filter(Boolean);const files=(await Promise.all(shopIds.map(id=>listFiles(id)))).flat();const manifest:{name:string;size:number;backup_path:string}[]=[];for(const file of files){const {data,error}=await admin.storage.from("car-images").download(file.name);if(error)throw error;const backupPath=`${input.tenantId}/${input.jobId}/photos/${file.name}`;const uploaded=await admin.storage.from("system-backups").upload(backupPath,data,{contentType:data.type||"application/octet-stream",upsert:true});if(uploaded.error)throw uploaded.error;manifest.push({...file,backup_path:backupPath})}const snapshot={version:2,tenant_id:input.tenantId,created_at:new Date().toISOString(),tables,storage_manifest:manifest};const body=JSON.stringify(snapshot);const checksum=createHash("sha256").update(body).digest("hex");const path=`${input.tenantId}/${input.jobId}/database.json`;const upload=await admin.storage.from("system-backups").upload(path,body,{contentType:"application/json",upsert:true});if(upload.error)throw upload.error;await admin.from("backup_artifacts").insert([{backup_job_id:input.jobId,artifact_type:"database_json",storage_path:path,checksum,size_bytes:Buffer.byteLength(body)},{backup_job_id:input.jobId,artifact_type:"storage_photos",storage_path:`${input.tenantId}/${input.jobId}/photos`,size_bytes:files.reduce((n,x)=>n+x.size,0)}]);await admin.from("backup_jobs").update({status:"completed",completed_at:new Date().toISOString(),object_count:files.length,size_bytes:Buffer.byteLength(body)+files.reduce((n,x)=>n+x.size,0),provider_reference:path,error_message:null}).eq("id",input.jobId);return{ok:true,path,checksum,table_count:Object.keys(tables).length,photo_count:files.length}}catch(error){const message=error instanceof Error?error.message:String(error);await admin.from("backup_jobs").update({status:"failed",completed_at:new Date().toISOString(),error_message:message}).eq("id",input.jobId);throw error}}

export async function restoreEnterpriseBackup(input:{requestId:string;backupJobId:string;tenantId:string}){
  const admin=getSupabaseAdmin();
  await admin.from("restore_requests").update({status:"running"}).eq("id",input.requestId);
  try{
    const{snapshot,checksum}=await loadVerifiedSnapshot({backupJobId:input.backupJobId,tenantId:input.tenantId});
    for(const table of TABLES){
      const rows=snapshot.tables[table]||[];
      if(rows.length){const{error}=await admin.from(table).upsert(rows,{onConflict:"id"});if(error)throw new Error(`${table}: ${error.message}`)}
    }
    for(const file of snapshot.storage_manifest||[]){
      if(!file.backup_path)continue;
      const downloaded=await admin.storage.from("system-backups").download(file.backup_path);if(downloaded.error)throw downloaded.error;
      const uploaded=await admin.storage.from("car-images").upload(file.name,downloaded.data,{contentType:downloaded.data.type||"application/octet-stream",upsert:true});if(uploaded.error)throw uploaded.error;
    }
    await admin.from("restore_requests").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",input.requestId);
    return{ok:true,checksum_verified:checksum,restored_tables:Object.keys(snapshot.tables).length,restored_photos:(snapshot.storage_manifest||[]).length};
  }catch(error){
    await admin.from("restore_requests").update({status:"failed",completed_at:new Date().toISOString()}).eq("id",input.requestId);
    throw error;
  }
}
