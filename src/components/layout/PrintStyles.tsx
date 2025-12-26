export function PrintStyles() {
    return (
      <style>{`
  @page {
    size: A4;
    margin: 12mm 12mm 14mm 12mm;
  }
  
  @media print {
    /* 画面UI（サイドバー等）を非表示にする */
    .no-print { display: none !important; }
  
    /* 印刷用の背景・余白調整 */
    body { background: #fff !important; }
    .print-page {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      break-after: page;
      page-break-after: always;
    }
  
    /* 印刷時に色味を調整（トナー節約と視認性） */
    .bg-slate-900 { background: #fff !important; color: #000 !important; }
    .text-white { color: #000 !important; }
    .bg-slate-50 { background: #fff !important; }
  }
      `}</style>
    );
  }