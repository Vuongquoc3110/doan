import net from 'net';

export interface ReceiptOrder { code: string; receiver_name: string; total: number; subtotal: number; discount: number; payment_status: string; created_at: string; }
export function receiptBytes(order: ReceiptOrder, items: any[], width: 58 | 80): Buffer {
  const cols = width === 58 ? 32 : 48;
  // ASCII is supported by all ESC/POS printers, independent of vendor-specific Vietnamese code pages.
  const ascii = (s: unknown) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7e]/g, '');
  const wrap = (s: string) => ascii(s).match(new RegExp(`.{1,${cols}}`, 'g'))?.join('\n') || '';
  const money = (n: unknown) => Number(n).toLocaleString('en-US') + ' VND';
  const pair = (left: string, right: string) => left.length+right.length>=cols?wrap(left)+'\n'+right.padStart(cols):left + ' '.repeat(cols-left.length-right.length) + right;
  const lines = ['VQ FRUIT', 'HOA DON BAN HANG', order.code, ascii(order.receiver_name), new Date(order.created_at).toLocaleString('en-GB', {timeZone:'Asia/Ho_Chi_Minh'}), '-'.repeat(cols)];
  for (const item of items) lines.push(wrap(item.product_name), wrap(item.variant_label), pair(`${item.qty} x ${money(item.unit_price)}`, money(item.total_price)));
  lines.push('-'.repeat(cols), pair('Tam tinh', money(order.subtotal)), pair('Giam gia', money(order.discount)), pair('TONG CONG', money(order.total)), order.payment_status === 'paid' ? 'DA THANH TOAN' : 'CHUA THANH TOAN', 'Cam on quy khach!', '', '', '');
  return Buffer.concat([Buffer.from([0x1b,0x40]), Buffer.from(lines.join('\n')+'\n','ascii'), Buffer.from([0x1d,0x56,0x42,0x03])]);
}
export function printerForStore(storeId: number): {host:string;port:number;width:58|80} {
  const value = JSON.parse(process.env.POS_PRINTERS_JSON || '{}')[String(storeId)];
  if (!value) throw new Error('Chi nhánh chưa cấu hình máy in LAN');
  const host = String(value.host || '');
  const parts = host.split('.').map(Number);
  const privateIp = net.isIP(host) === 4 && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (process.env.NODE_ENV === 'test' && parts[0] === 127));
  if (!privateIp || ![58,80].includes(value.width) || !Number.isInteger(value.port || 9100) || (value.port || 9100) < 1 || (value.port || 9100) > 65535) throw new Error('Cấu hình máy in không hợp lệ');
  return {host, port:value.port || 9100, width:value.width};
}
export async function sendReceipt(printer: {host:string;port:number}, bytes: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({host:printer.host, port:printer.port});
    socket.setTimeout(5000, () => socket.destroy(new Error('Máy in không phản hồi')));
    socket.once('error', reject);
    socket.once('connect', () => socket.end(bytes));
    socket.once('close', hadError => { if (!hadError) resolve(); });
  });
}
