export const coupons=[
  {code:'HALLOWEEN10',title:'10% de gostosura extra',description:'10% nos pratos, sem pedido mínimo.',minimum:0,kind:'percent',percent:10,cap:null},
  {code:'BOO15',title:'A fome levou um susto',description:'15% nos pratos a partir de R$ 60. Desconto máximo de R$ 20.',minimum:6000,kind:'percent',percent:15,cap:2000},
  {code:'FRETEGRATIS',title:'A entrega é por nossa conta',description:'Entrega grátis em pedidos a partir de R$ 45.',minimum:4500,kind:'delivery'}
];
export function quote(items,fee,code=''){
  const subtotal=items.reduce((sum,i)=>sum+i.price*i.quantity,0);
  const normalized=String(code).trim().toUpperCase(),coupon=coupons.find(c=>c.code===normalized);
  if(normalized&&!coupon)throw new Error('Cupom não encontrado. Confira os cupons disponíveis.');
  if(coupon&&subtotal<coupon.minimum)throw new Error(`Este cupom exige pelo menos R$ ${(coupon.minimum/100).toFixed(2).replace('.',',')} em pratos.`);
  const discount=!coupon?0:coupon.kind==='delivery'?fee:Math.min(Math.round(subtotal*coupon.percent/100),coupon.cap??subtotal);
  return {subtotal,fee,discount,total:subtotal+fee-discount,coupon:normalized};
}
