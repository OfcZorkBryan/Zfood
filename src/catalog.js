export const restaurants = [
  {id:'brasa',name:'Brasa Burger',category:'Hambúrgueres',emoji:'🍔',rating:'4,9',time:'25–40 min',fee:599,tag:'Queridinho da galera'},
  {id:'forno',name:'Forno da Vila',category:'Pizzas',emoji:'🍕',rating:'4,8',time:'35–50 min',fee:799,tag:'Massa artesanal'},
  {id:'verde',name:'Verde & Grão',category:'Saudável',emoji:'🥗',rating:'4,9',time:'20–35 min',fee:499,tag:'Leve e de verdade'},
  {id:'doce',name:'Doce Encanto',category:'Doces',emoji:'🍩',rating:'4,8',time:'20–30 min',fee:499,tag:'Um final feliz'}
];
export const products = [
  {id:'b1',restaurantId:'brasa',name:'Smash da meia-noite',description:'Dois smash burgers, cheddar, cebola caramelizada e molho da casa.',price:3290,category:'Hambúrgueres',image:'photo-1568901346375-23c9450c58cd',emoji:'🍔',badge:'Mais pedido'},
  {id:'b2',restaurantId:'brasa',name:'Monstro de bacon',description:'Burger de 180 g, bacon crocante, queijo e pão brioche.',price:3890,category:'Hambúrgueres',image:'photo-1550547660-d9450f859349',emoji:'🍔',badge:'Especial Halloween'},
  {id:'b3',restaurantId:'brasa',name:'Batata enfeitiçada',description:'Batatas douradas com cheddar cremoso e farofinha de bacon.',price:2190,category:'Porções',image:'photo-1573080496219-bb080dd4f877',emoji:'🍟'},
  {id:'b4',restaurantId:'brasa',name:'Limonada da bruxa',description:'Limão, hortelã e muito gelo. Refrescante de verdade. 400 ml.',price:990,category:'Bebidas',image:'photo-1544145945-f90425340c7e',emoji:'🍹'},
  {id:'p1',restaurantId:'forno',name:'Margherita da vila',description:'Molho de tomate, muçarela e manjericão fresco. 8 fatias.',price:5990,category:'Pizzas',image:'photo-1574071318508-1cdbab80d002',emoji:'🍕',badge:'Artesanal'},
  {id:'p2',restaurantId:'forno',name:'Pepperoni infernal',description:'Muçarela, pepperoni e um toque de pimenta. 8 fatias.',price:6790,category:'Pizzas',image:'photo-1628840042765-356cda07504e',emoji:'🍕'},
  {id:'s1',restaurantId:'verde',name:'Bowl energia boa',description:'Grãos, folhas, abacate, legumes frescos e molho cítrico.',price:2990,category:'Saudável',image:'photo-1512621776951-a57141f2eefd',emoji:'🥗',badge:'Vegetariano'},
  {id:'s2',restaurantId:'verde',name:'Salada do jardim',description:'Mix de folhas, tomate, pepino, cenoura e sementes.',price:2490,category:'Saudável',image:'photo-1511690743698-d9d85f2fbf38',emoji:'🥗'},
  {id:'d1',restaurantId:'doce',name:'Brownie travessura',description:'Chocolate intenso, casquinha fina e coração macio.',price:1490,category:'Doces',image:'photo-1606313564200-e75d5e30476c',emoji:'🍫',badge:'Para adoçar'},
  {id:'d2',restaurantId:'doce',name:'Donuts encantados',description:'Duo de donuts fofinhos com cobertura de chocolate.',price:1890,category:'Doces',image:'photo-1551024506-0bccd828d307',emoji:'🍩'},
  {id:'c1',restaurantId:'brasa',name:'Combo da Bruxa',description:'Smash da meia-noite + batata enfeitiçada + limonada de 400 ml. Um feitiço completo.',price:4790,oldPrice:6470,category:'Combos',image:'photo-1561758033-d89a9ad46330',emoji:'🍔',badge:'Economize R$ 16,80'},
  {id:'c2',restaurantId:'brasa',name:'Dupla de outro mundo',description:'Dois smash burgers, uma batata para dividir e duas limonadas. Para assustar a fome a dois.',price:7990,oldPrice:10750,category:'Combos',image:'photo-1571091718767-18b5b1457add',emoji:'🍔',badge:'Combo para 2'},
  {id:'p3',restaurantId:'forno',name:'Noite de pizza',description:'Uma margherita e uma pepperoni, 8 fatias cada. A sessão de filmes já pode começar.',price:9990,oldPrice:12780,category:'Combos',image:'photo-1513104890138-7c749659a591',emoji:'🍕',badge:'Para compartilhar'},
  {id:'d3',restaurantId:'doce',name:'Cookie do gato preto',description:'Dois cookies com gotas de chocolate. Crocantes por fora e macios no meio.',price:1290,category:'Doces',image:'photo-1499636136210-6f4ee915583e',emoji:'🍪',badge:'Novidade'}
];
for(const p of products)p.imageUrl=`/media/${p.id}.jpg`;
for(const r of restaurants)r.imageUrl=products.find(p=>p.restaurantId===r.id).imageUrl;
