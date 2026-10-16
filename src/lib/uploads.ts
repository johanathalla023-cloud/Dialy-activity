/**
 * Batas ukuran berkas unggahan.
 *
 * 4 MB (bukan 5 MB) dipilih supaya aman saat live di Vercel: Serverless Function
 * membatasi ukuran body request sekitar 4,5 MB, sehingga berkas 5 MB akan gagal.
 * Nilai ini dipakai bersama oleh API upload (server) dan form log (browser).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
export const UPLOAD_ACCEPT = "image/*,application/pdf";
