"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface Product { id: number; name: string; price: number; thumb: string; category: string; sortOrder: number; isActive: boolean; }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Record<string, string | number> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/products").then(r => r.json()).then(setProducts); }, []);
  useEffect(() => { load(); }, [load]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const handleSave = async () => {
    if (!editing?.name) return;
    if (editId) {
      await fetch(`/api/admin/products/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("수정되었습니다.");
    } else {
      await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("등록되었습니다.");
    }
    setEditing(null); setEditId(null); load();
  };

  const handleToggle = async (p: Product) => {
    await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    flash("삭제되었습니다."); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">포인트 상품 관리 <span className="text-sm font-normal text-gray-400 ml-1">{products.length}개</span></h1>
        <button onClick={() => { setEditing({ name: "", price: 10000, thumb: "", category: "spon", sortOrder: 0 }); setEditId(null); }} className="h-8 px-4 bg-gray-800 text-white text-[12px] font-bold rounded">새 상품 등록</button>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? "상품 수정" : "새 상품 등록"}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[13px]">
            <div><label className="text-[11px] text-gray-500 block mb-1">상품명 *</label><input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">가격 (P)</label><input type="number" value={editing.price ?? 0} onChange={e => setEditing({ ...editing, price: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">카테고리</label>
              <select value={editing.category || "spon"} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]">
                <option value="spon">스폰상품</option>
                <option value="affiliate">제휴스폰</option>
              </select>
            </div>
            <div><ImageUpload value={String(editing.thumb || "")} onChange={v => setEditing({ ...editing, thumb: v })} category="products" label="상품 이미지" width={100} height={100} /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">정렬 순서</label><input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="h-8 px-4 bg-blue-600 text-white text-[12px] font-bold rounded">저장</button>
            <button onClick={() => { setEditing(null); setEditId(null); }} className="h-8 px-4 bg-gray-100 text-gray-600 text-[12px] font-bold rounded">취소</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">이미지</th>
              <th className="px-3 py-2.5 text-left font-semibold">상품명</th>
              <th className="px-3 py-2.5 text-right font-semibold">가격</th>
              <th className="px-3 py-2.5 text-center font-semibold">카테고리</th>
              <th className="px-3 py-2.5 text-center font-semibold">순서</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.id}</td>
                <td className="px-3 py-2">{p.thumb && <img src={p.thumb} alt="" className="w-10 h-10 object-cover rounded" />}</td>
                <td className="px-3 py-2 font-semibold"><button onClick={() => { setEditing({ name: p.name, price: p.price, thumb: p.thumb, category: p.category, sortOrder: p.sortOrder }); setEditId(p.id); }} className="text-blue-600 hover:underline text-left">{p.name}</button></td>
                <td className="px-3 py-2 text-right font-mono font-bold text-blue-600">{p.price.toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-[11px] text-gray-600">{p.category === "spon" ? "스폰상품" : "제휴스폰"}</td>
                <td className="px-3 py-2 text-center text-gray-500">{p.sortOrder}</td>
                <td className="px-3 py-2 text-center"><button onClick={() => handleToggle(p)} className={`text-[11px] font-bold ${p.isActive ? "text-green-600" : "text-gray-400"}`}>{p.isActive ? "활성" : "비활성"}</button></td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { setEditing({ name: p.name, price: p.price, thumb: p.thumb, category: p.category, sortOrder: p.sortOrder }); setEditId(p.id); }} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(p.id)} className="text-[12px] font-bold text-red-500 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
