import jsPDF from 'jspdf';
import { RekamMedis, Pasien, Dokter, DataKlinik, RiwayatVaksinasi } from '../types';
import { normalizeClinicProfile } from '../utils/clinic';

export function printRekamMedisPDF(rm: RekamMedis, pasien: Pasien, dokter: Dokter, klinik: DataKlinik) {
  klinik = normalizeClinicProfile(klinik);
  const doc = new jsPDF();

  // Header Kop Surat
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(klinik.namaKlinik.toUpperCase(), 105, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(klinik.alamat, 105, 25, { align: 'center' });
  doc.text(`Telp: ${klinik.noTelp} | WA: ${klinik.noWhatsApp} | Email: ${klinik.email}`, 105, 30, { align: 'center' });
  doc.line(15, 34, 195, 34);
  doc.line(15, 35, 195, 35);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN REKAM MEDIS ANABUL / PASIEN', 105, 43, { align: 'center' });

  // Patient & Visit Info Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('I. DATA PASIEN & PEMILIK', 15, 52);

  doc.setFont('helvetica', 'normal');
  doc.text(`No. Rekam Medis : ${rm.noRM}`, 15, 59);
  doc.text(`Tanggal Periksa   : ${rm.tanggal}`, 120, 59);

  doc.text(`Nama Hewan      : ${pasien.namaHewan} (${pasien.jenisHewan} - ${pasien.ras})`, 15, 65);
  doc.text(`Jenis Kelamin      : ${pasien.jenisKelamin}`, 120, 65);

  doc.text(`Umur / Warna     : ${pasien.umurFormat || '-'} / ${pasien.warna}`, 15, 71);
  doc.text(`No. Microchip      : ${pasien.noMicrochip || '-'}`, 120, 71);

  doc.text(`Nama Pemilik     : ${pasien.namaOwner} (${pasien.noHpOwner})`, 15, 77);
  doc.text(`Alamat Pemilik   : ${pasien.alamatOwner}`, 15, 83);

  doc.line(15, 87, 195, 87);

  // SOAP Section
  doc.setFont('helvetica', 'bold');
  doc.text('II. ANAMNESA & PEMERIKSAAN FISIK (SOAP)', 15, 94);

  doc.setFont('helvetica', 'bold');
  doc.text('Subjective (S):', 15, 101);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Keluhan Utama: ${rm.subjective.keluhan}`, 20, 107);
  doc.text(`• Anamnesa Detail: ${rm.subjective.anamnesa}`, 20, 113);
  doc.text(`• Makan/Minum: ${rm.subjective.makanMinum} | Durasi Sakit: ${rm.subjective.durasiSakit}`, 20, 119);

  doc.setFont('helvetica', 'bold');
  doc.text('Objective (O):', 15, 127);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Berat Badan: ${rm.objective.beratBadan} kg  |  Suhu: ${rm.objective.suhu}°C`, 20, 133);
  doc.text(`• CRT: ${rm.objective.crt}  |  Status Dehidrasi: ${rm.objective.dehidrasi}`, 20, 139);
  doc.text(`• Temuan Fisik: ${rm.objective.pemeriksaanFisik}`, 20, 145);

  doc.setFont('helvetica', 'bold');
  doc.text('Assessment (A):', 15, 153);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Diagnosa Utama: ${rm.assessment.diagnosaUtama}`, 20, 159);
  if (rm.assessment.diagnosaBanding) {
    doc.text(`• Diagnosa Banding: ${rm.assessment.diagnosaBanding}`, 20, 165);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Plan (P):', 15, 173);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Status Lanjutan: ${rm.plan.statusLanjutan}`, 20, 179);
  if (rm.plan.pakanAnjuran) {
    doc.text(`• Anjuran Pakan: ${rm.plan.pakanAnjuran}`, 20, 185);
  }

  // Resep Obat & Tindakan
  let y = 193;
  if (rm.plan.tindakanList.length > 0) {
    doc.text(`• Tindakan: ${rm.plan.tindakanList.map(t => t.namaTindakan).join(', ')}`, 20, y);
    y += 6;
  }
  if (rm.plan.resepList.length > 0) {
    doc.text(`• Resep Obat: ${rm.plan.resepList.map(r => `${r.namaBarang} (${r.dosis} - ${r.aturanPakai})`).join('; ')}`, 20, y);
    y += 6;
  }

  // Signature Block
  y += 15;
  doc.text(`Jember, ${rm.tanggal}`, 140, y);
  doc.text('Dokter Pemeriksa,', 140, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(dokter.nama, 140, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`SIP: ${dokter.sip}`, 140, y + 35);

  doc.save(`RM_${rm.noRM}_${pasien.namaHewan}.pdf`);
}

export function printSuratSehatPDF(pasien: Pasien, dokter: Dokter, klinik: DataKlinik, peruntukan = 'Persyaratan Perjalanan / Penitipan') {
  klinik = normalizeClinicProfile(klinik);
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(klinik.namaKlinik.toUpperCase(), 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(klinik.alamat, 105, 25, { align: 'center' });
  doc.text(`Telp: ${klinik.noTelp} | WA: ${klinik.noWhatsApp}`, 105, 30, { align: 'center' });
  doc.line(15, 34, 195, 34);

  // Document Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT KETERANGAN KESEHATAN HEWAN', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Nomor: SKH/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`, 105, 51, { align: 'center' });

  // Body
  doc.setFont('helvetica', 'normal');
  doc.text('Yang bertanda tangan di bawah ini Dokter Hewan Praktik pada Klinik Hewan VetCare:', 15, 65);

  doc.text(`Nama Dokter       : ${dokter.nama}`, 25, 73);
  doc.text(`SIP Dokter          : ${dokter.sip}`, 25, 79);
  doc.text(`Nama Klinik        : ${klinik.namaKlinik}`, 25, 85);

  doc.text('Menerangkan bahwa telah melakukan pemeriksaan fisik secara seksama terhadap hewan berikut:', 15, 95);

  doc.text(`Nama Hewan       : ${pasien.namaHewan}`, 25, 103);
  doc.text(`Spesies / Ras      : ${pasien.jenisHewan} / ${pasien.ras}`, 25, 109);
  doc.text(`Jenis Kelamin      : ${pasien.jenisKelamin}`, 25, 115);
  doc.text(`Umur / Warna     : ${pasien.umurFormat || '-'} / ${pasien.warna}`, 25, 121);
  doc.text(`Nama Pemilik     : ${pasien.namaOwner}`, 25, 127);
  doc.text(`Alamat Pemilik   : ${pasien.alamatOwner}`, 25, 133);

  doc.text('Berdasarkan hasil pemeriksaan klinis saat ini, hewan tersebut dinyatakan:', 15, 143);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('>>> SEHAT DAN BEBAS DARI GEJALA PENYAKIT MENULAR <<<', 105, 153, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Surat keterangan ini diterbitkan untuk keperluan: ${peruntukan}.`, 15, 165);
  doc.text('Demikian surat keterangan kesehatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.', 15, 172);

  // Signature
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Jember, ${todayStr}`, 135, 190);
  doc.text('Dokter Hewan Pemeriksa,', 135, 196);
  doc.setFont('helvetica', 'bold');
  doc.text(dokter.nama, 135, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`SIP: ${dokter.sip}`, 135, 230);

  doc.save(`Surat_Sehat_${pasien.namaHewan}.pdf`);
}

export function printVaksinCertificatePDF(pasien: Pasien, vaksin: RiwayatVaksinasi, dokter: Dokter, klinik: DataKlinik) {
  klinik = normalizeClinicProfile(klinik);
  const doc = new jsPDF('landscape', 'mm', 'a5');

  // Decorative Border
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 138);
  doc.rect(7, 7, 196, 134);

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(klinik.namaKlinik.toUpperCase(), 105, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(klinik.alamat, 105, 23, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SERTIFIKAT VAKSINASI VETERINER', 105, 33, { align: 'center' });

  // Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama Hewan  : ${pasien.namaHewan}`, 15, 45);
  doc.text(`Spesies / Ras : ${pasien.jenisHewan} / ${pasien.ras}`, 15, 52);
  doc.text(`Jenis Kelamin : ${pasien.jenisKelamin}`, 15, 59);
  doc.text(`Pemilik       : ${pasien.namaOwner}`, 15, 66);

  doc.text(`Jenis Vaksin  : ${vaksin.namaVaksin}`, 110, 45);
  doc.text(`Batch No.     : ${vaksin.batchNo}`, 110, 52);
  doc.text(`Tgl Vaksin    : ${vaksin.tanggalVaksin}`, 110, 59);
  doc.text(`Vaksin Ulang  : ${vaksin.tanggalVaksinUlang}`, 110, 66);

  doc.line(15, 72, 195, 72);

  doc.text('Menyatakan bahwa hewan diatas telah menerima vaksinasi sesuai dengan protokol kesehatan veteriner.', 15, 80);

  // Stamp / Signature
  doc.text('Jember, ' + vaksin.tanggalVaksin, 140, 95);
  doc.text('Dokter Hewan,', 140, 101);
  doc.setFont('helvetica', 'bold');
  doc.text(dokter.nama, 140, 125);
  doc.setFont('helvetica', 'normal');
  doc.text(`SIP: ${dokter.sip}`, 140, 130);

  doc.save(`Sertifikat_Vaksin_${pasien.namaHewan}.pdf`);
}

export function printOutpatientCarePDF(rm: RekamMedis, pasien: Pasien, dokter: Dokter, klinik: DataKlinik) {
  klinik = normalizeClinicProfile(klinik);
  const doc = new jsPDF();

  // Header Kop
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(klinik.namaKlinik.toUpperCase(), 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(klinik.alamat, 105, 25, { align: 'center' });
  doc.text(`Telp: ${klinik.noTelp} | WA: ${klinik.noWhatsApp} | Email: ${klinik.email}`, 105, 30, { align: 'center' });
  doc.line(15, 34, 195, 34);
  doc.line(15, 35, 195, 35);

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT KETERANGAN PEMERIKSAAN RAWAT JALAN & RESEP OBAT', 105, 43, { align: 'center' });

  // Detail Pasien
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. Rekam Medis : ${rm.noRM}`, 15, 52);
  doc.text(`Tanggal Periksa   : ${rm.tanggal}`, 120, 52);

  doc.text(`Nama Pasien      : ${pasien.namaHewan} (${pasien.jenisHewan} - ${pasien.ras})`, 15, 58);
  doc.text(`Jenis Kelamin      : ${pasien.jenisKelamin}`, 120, 58);

  doc.text(`Nama Pemilik     : ${pasien.namaOwner} (${pasien.noHpOwner})`, 15, 64);
  doc.text(`Dokter Pemeriksa: ${dokter.nama}`, 120, 64);

  doc.line(15, 68, 195, 68);

  // Hasil Pemeriksaan
  doc.setFont('helvetica', 'bold');
  doc.text('I. HASIL PEMERIKSAAN KLINIS & DIAGNOSA', 15, 75);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Keluhan Utama : ${rm.subjective.keluhan}`, 20, 82);
  doc.text(`• Suhu & Berat  : ${rm.objective.suhu}°C / ${rm.objective.beratBadan} kg`, 20, 88);
  doc.text(`• Diagnosa      : ${rm.assessment.diagnosaUtama}`, 20, 94);

  doc.line(15, 98, 195, 98);

  // Resep & Aturan Minum Obat
  doc.setFont('helvetica', 'bold');
  doc.text('II. RESEP & ATURAN MINUM OBAT JALAN', 15, 105);

  let y = 112;
  doc.setFont('helvetica', 'normal');
  if (rm.plan.resepList && rm.plan.resepList.length > 0) {
    rm.plan.resepList.forEach((r, idx) => {
      doc.text(`${idx + 1}. ${r.namaBarang} - Dosis: ${r.dosis} (${r.aturanPakai})`, 20, y);
      y += 6;
    });
  } else {
    doc.text('• Tidak ada resep obat non-racikan', 20, y);
    y += 6;
  }

  if (rm.plan.racikanList && rm.plan.racikanList.length > 0) {
    rm.plan.racikanList.forEach((rac, idx) => {
      doc.text(`[Racikan ${idx + 1}] ${rac.namaRacikan} (${rac.jumlahBungkus} Bks) - ${rac.aturanPakai}`, 20, y);
      y += 6;
    });
  }

  doc.line(15, y + 2, 195, y + 2);
  y += 9;

  // Anjuran & Kontrol
  doc.setFont('helvetica', 'bold');
  doc.text('III. ANJURAN PETUNJUK PERAWATAN DI RUMAH', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (rm.plan.pakanAnjuran) {
    doc.text(`• Anjuran Pakan: ${rm.plan.pakanAnjuran}`, 20, y);
    y += 6;
  }
  if (rm.plan.catatanTambahan) {
    doc.text(`• Catatan Dokter: ${rm.plan.catatanTambahan}`, 20, y);
    y += 6;
  }
  if (rm.plan.tanggalKontrolUlang) {
    doc.setFont('helvetica', 'bold');
    doc.text(`• JADWAL KONTROL ULANG: ${rm.plan.tanggalKontrolUlang}`, 20, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
  }

  // Tanda Tangan
  y += 12;
  doc.text(`Jember, ${rm.tanggal}`, 140, y);
  doc.text('Dokter Hewan Pemeriksa,', 140, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(dokter.nama, 140, y + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`SIP: ${dokter.sip}`, 140, y + 33);

  doc.save(`Surat_Rawat_Jalan_${pasien.namaHewan}_${rm.noRM}.pdf`);
}

