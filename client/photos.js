'use strict';
window.foodPhoto=(url,sizes='(max-width:680px) 45vw, (max-width:1000px) 45vw, 30vw')=>{
 const e=window.Bunty.escape,p=window.FoodImages?.[url];
 return `src="${e(p?.src||url)}"${p&&!navigator.connection?.saveData?` srcset="${e(p.srcset)}" sizes="${e(sizes)}"`:''}`;
};
window.setFoodImage=(img,url)=>{const p=window.FoodImages?.[url];img.src=p?.src||url;if(p&&!navigator.connection?.saveData){img.srcset=p.srcset;img.sizes='(max-width:680px) 80vw, 45vw';}else img.removeAttribute('srcset');};
