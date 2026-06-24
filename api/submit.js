export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } } // Antisipasi ukuran foto besar
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { 
    nik, nama, branch, sa, tanggal, noInet, jenisPekerjaan, keterangan, 
    fotoPekerjaan, fotoPelanggan, fotoBAST 
  } = req.body;

  // 1. Generate ID Evidence Unik (Contoh: EVD-20260624-XXXX)
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const idEvidence = `EVD-${dateStr}-${randomStr}`;

  // 2. Susun Caption untuk di Channel (-1004426144664)
  const caption = `<b>Laporan Baru!</b>\n\n` +
                  `<b>ID Evidence:</b> ${idEvidence}\n` +
                  `<b>No Internet:</b> ${noInet}\n` +
                  `<b>Nama:</b> ${nama} (${nik})\n` +
                  `<b>Jenis Pekerjaan:</b> ${jenisPekerjaan}\n` +
                  `<b>Keterangan:</b> ${keterangan}`;

  // Karena ini Serverless Vercel dan kirim MediaGroup Base64 agak tricky, 
  // Opsi paling aman: Kita pakai script fetch yang loop upload ke Telegram.
  // Untuk kepraktisan, kita bisa kirim foto 1 per 1 dengan bot API "sendPhoto".
  // Foto pertama memuat Caption ID.
  
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHANNEL_ID = "-1004426144664";
  const GAS_URL = "URL_GAS_KAMU_DISINI"; // MASUKKAN URL GAS DO_POST DISINI

  // Kumpulkan semua base64 file dalam 1 array
  const allPhotos = [...fotoPekerjaan, fotoPelanggan, fotoBAST];

  try {
    // A. Kirim Foto ke Telegram Channel
    for (let i = 0; i < allPhotos.length; i++) {
        // Hapus header base64 (data:image/jpeg;base64,)
        const base64Data = allPhotos[i].split(',')[1]; 
        const buffer = Buffer.from(base64Data, 'base64');
        
        const formData = new FormData();
        formData.append('chat_id', CHANNEL_ID);
        // Tambahkan caption HANYA pada foto pertama
        if (i === 0) {
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');
        }
        
        // Buat blob dari buffer
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        formData.append('photo', blob, `photo${i}.jpg`);

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
    }

    // B. Kirim Teks ke Spreadsheet (GAS)
    await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            branch, sa, noInet, nama, nik, jenisPekerjaan, idEvidence, keterangan
        })
    });

    res.status(200).json({ success: true, id: idEvidence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
