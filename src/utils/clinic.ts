import { DataKlinik } from '../types';

const DEFAULT_LOGO_URL = 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=150&auto=format&fit=crop&q=80';

export function normalizeClinicProfile(value: Partial<DataKlinik> | null | undefined): DataKlinik {
  const source = (value || {}) as Partial<DataKlinik> & Record<string, any>;
  const phone = source.noTelp || source.telepon || source.noTelepon || '';
  const footer = source.footerNota || source.pesanNotaFooter || source.footer_receipt || '';
  const responsible = source.namaPenanggungJawab || source.drhPenanggungJawab || '';

  return {
    namaKlinik: source.namaKlinik || source.nama_klinik || 'Klinik Hewan',
    alamat: source.alamat || '',
    noTelp: phone,
    noWhatsApp: source.noWhatsApp || phone,
    email: source.email || '',
    website: source.website || '',
    logoUrl: source.logoUrl || source.logo_url || DEFAULT_LOGO_URL,
    headerNota: source.headerNota || source.header_nota || '',
    footerNota: footer,
    npwp: source.npwp || '',
    namaPenanggungJawab: responsible,
  };
}
