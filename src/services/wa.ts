import { JanjiTemu, Pasien, Transaksi, DataKlinik, RawatInap } from '../types';

export function formatWaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

export function generateWaLink(phone: string, text: string): string {
  const formattedPhone = formatWaPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export const waTemplates = {
  appointmentReminder(jt: JanjiTemu, pasien: Pasien, dokterName: string, klinik: DataKlinik): string {
    return `Halo Kak ${pasien.namaOwner},\n\nSalam dari *${klinik.namaKlinik}* 🐾\nKami mengingatkan jadwal Janji Temu berobat/pemeriksaan untuk anabul tersayang:\n\n*Nama Hewan:* ${pasien.namaHewan} (${pasien.jenisHewan})\n*Dokter:* ${dokterName}\n*Tanggal & Waktu:* ${jt.tanggal} Jam ${jt.jam} WIB\n*Layanan:* ${jt.layanan}\n\nMohon hadir 10 menit sebelum jadwal. Jika ada perubahan jadwal, harap hubungi kami. Terima kasih! 🙏`;
  },

  vaccineAlert(pasien: Pasien, namaVaksin: string, tglUlang: string, klinik: DataKlinik): string {
    return `Halo Kak ${pasien.namaOwner},\n\nSalam sehat dari *${klinik.namaKlinik}* 🐾\nBerdasarkan riwayat medis, sudah waktunya bagi *${pasien.namaHewan}* untuk menerima *Vaksinasi Ulang ${namaVaksin}* pada tanggal *${tglUlang}*.\n\nVaksinasi tepat waktu sangat penting untuk menjaga kekebalan anabul dari infeksi berbahaya. Hubungi kami untuk reservasi jadwal ya! Terima kasih. 😊`;
  },

  inpatientUpdate(pasien: Pasien, inap: RawatInap, kondisi: string, suhu: number, klinik: DataKlinik): string {
    return `Halo Kak ${pasien.namaOwner},\n\nBerikut update kondisi rawat inap *${pasien.namaHewan}* di *${klinik.namaKlinik}* per hari ini:\n\n*Suhu Tubuh:* ${suhu}°C\n*Kondisi Umum:* ${kondisi}\n*Kandang:* ${inap.noKandang}\n\nTim dokter dan perawat kami terus memantau perkembangannya dengan cermat. Kakak dapat menjenguk pada jam besuk klinik. Sehat selalu! ❤️`;
  },

  outpatientFollowup(pasien: Pasien, diagnosa: string, resepStr: string, tglKontrol: string, klinik: DataKlinik): string {
    return `Halo Kak ${pasien.namaOwner},\n\nSalam dari *${klinik.namaKlinik}* 🐾\nBerikut ringkasan pelayanan Rawat Jalan & Petunjuk Minum Obat untuk *${pasien.namaHewan}*:\n\n*Diagnosa:* ${diagnosa}\n*Resep & Aturan Minum Obat:*\n${resepStr}\n${tglKontrol ? `\n*Jadwal Kontrol Ulang:* ${tglKontrol}` : ''}\n\nPastikan obat diminum teratur sesuai dosis. Bila ada reaksi alergi atau muntah, segera hubungi kami. Semoga *${pasien.namaHewan}* lekas sembuh! ❤️`;
  },

  receiptSummary(trx: Transaksi, klinik: DataKlinik): string {
    return `Halo Kak ${trx.namaPelanggan},\n\nTerima kasih telah mempercayakan perawatan di *${klinik.namaKlinik}*.\nBerikut ringkasan transaksi Anda:\n\n*No. Nota:* ${trx.noNota}\n*Tanggal:* ${trx.tanggal}\n*Total Pembayaran:* Rp ${(trx.grandTotal || 0).toLocaleString('id-ID')}\n*Metode:* ${trx.metodePembayaran}\n*Status:* ${trx.status}\n\nStruk resmi telah diterbitkan. Semoga anabul selalu sehat dan ceria! 🐾`;
  }
};
