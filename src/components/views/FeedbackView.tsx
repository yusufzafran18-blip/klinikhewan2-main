import React from 'react';
import { FeedbackPelanggan, Pasien } from '../../types';
import { MessageSquare, Star, User } from 'lucide-react';

interface FeedbackViewProps {
  feedbackList: FeedbackPelanggan[];
  pasienList: Pasien[];
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  feedbackList = [],
  pasienList = [],
}) => {
  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Ulasan & Feedback Owner Pasien</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Evaluasi kepuasan layanan medis, kebersihan klinik, & keramahan staf</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedbackList.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
            Belum ada feedback ulasan dari owner pasien.
          </div>
        ) : (
          feedbackList.map((f) => {
            const pasien = pasienList.find((p) => p.id === f.pasienId);

            return (
              <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{f.namaPelanggan}</h4>
                    <p className="text-xs text-slate-400">Pasien: {pasien?.namaHewan || 'Anabul'} • {f.tanggal}</p>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-400 font-bold text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{f.rating} / 5</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{f.komentar}"
                </p>

                {f.saranPetugas && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-lg font-medium">
                    💡 <span className="font-bold">Saran:</span> {f.saranPetugas}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
