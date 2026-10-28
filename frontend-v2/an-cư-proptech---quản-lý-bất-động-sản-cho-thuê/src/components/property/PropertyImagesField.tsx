import { useEffect, useState } from 'react';
export function PropertyImagesField({files,onChange,disabled}:{files:File[];onChange:(files:File[])=>void;disabled:boolean}) {
  const [previews,setPreviews]=useState<string[]>([]);const [error,setError]=useState('');
  useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url));},[files]);
  return <fieldset disabled={disabled} className="border rounded-xl p-4 space-y-3 min-w-0"><legend className="font-semibold px-1">Ảnh giới thiệu tài sản *</legend>
    <p className="text-sm text-slate-600">Từ 1 đến 4 ảnh JPEG/PNG, tối đa 5MB/ảnh. Ảnh đầu tiên làm ảnh đại diện. Không tải CCCD hoặc giấy tờ pháp lý vào đây.</p>
    <label className="block text-sm font-medium">Thêm ảnh tài sản<input type="file" accept="image/jpeg,image/png" multiple className="block w-full mt-2" onChange={event=>{
      const added=Array.from(event.target.files??[]);event.target.value='';setError('');
      if(files.length+added.length>4){setError('Chỉ được chọn tối đa 4 ảnh.');return;}
      if(added.some(file=>!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)){setError('Chỉ nhận JPEG/PNG tối đa 5MB mỗi ảnh.');return;}
      onChange([...files,...added]);
    }}/></label>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <p className="text-sm">Đã chọn {files.length}/4 ảnh</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{files.map((file,index)=><div key={`${index}-${file.name}`} className="min-w-0"><img src={previews[index]} alt={`Ảnh tài sản ${index+1}`} className="w-full h-28 object-cover rounded-lg"/><p className="text-xs truncate">{file.name}</p><button type="button" onClick={()=>onChange(files.filter((_,i)=>i!==index))} className="text-sm text-rose-700 underline">Xóa ảnh {index+1}</button></div>)}</div>
  </fieldset>;
}
