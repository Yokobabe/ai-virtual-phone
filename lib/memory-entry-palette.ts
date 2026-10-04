import { rgb, hex, mix, ink } from "./chat-bubble-colors";

const bubble = { rgb, hex, mix, ink };
export type MemoryRepresentativeColor = { color: string; h: number; s: number; l: number; weight: number; chroma: number; score: number };
export type MemoryColorSample = { neutral: string; colors: MemoryRepresentativeColor[] };
type Pixel = { rgb: number[]; s: number; l: number; weight: number };
type Bin = { weight: number; r: number; g: number; b: number; count: number; saturations: number[]; samples: Pixel[] };

// Ported from the user-approved standalone memory preview. Chat bubble sampling is unchanged.
function hslOf(color: string): [number, number, number] {
  const [r,g,b] = bubble.rgb(color).map(c=>c/255);
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;
  const h=d===0?0:(hi===r?((g-b)/d+6)%6:hi===g?(b-r)/d+2:(r-g)/d+4)*60;
  return [h,d===0?0:d/(1-Math.abs(2*l-1)),l];
}
function hslColor(h: number, s: number, l: number): string {
  const a=s*Math.min(l,1-l);
  return bubble.hex([0,8,4].map(n=>{const k=(n+((h%360+360)%360)/30)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));}));
}
const hueDistance=(a: number,b: number)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
const ramp=(lo: number,hi: number,x: number)=>{const t=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t);};
export function representativeColors(pixels: ArrayLike<number>): MemoryColorSample | null {
  const bins: Bin[]=Array.from({length:36},()=>({weight:0,r:0,g:0,b:0,count:0,saturations:[],samples:[]}));
  let visible=0,chromatic=0,centralWarm=0;const total=[0,0,0];
  const size=Math.sqrt(pixels.length/4);
  for(let i=0;i+3<pixels.length;i+=4) {
    if(pixels[i+3]<128)continue;
    const c=[pixels[i],pixels[i+1],pixels[i+2]],hi=Math.max(...c)/255,lo=Math.min(...c)/255,d=hi-lo;
    visible++;c.forEach((v,k)=>total[k]+=v);
    if(d<.055||hi<.15||lo>.92)continue;
    const [h,s,l]=hslOf(bubble.hex(c));
    const x=(i/4%size)/size,y=Math.floor(i/4/size)/size;
    const skinLike=x>.27&&x<.73&&y>.2&&y<.75&&h>8&&h<50&&s>.15&&s<.75&&l>.42;
    if(skinLike)centralWarm++;
    // Saturated midtones express the image's identity; near-black shadows do not.
    const weight=(.08+Math.pow(s,2)*3)*(.025+.975*ramp(.14,.44,l))*(1-.75*ramp(.82,.98,l))*(skinLike?.3:1);
    const bin=bins[Math.round(h/10)%36];bin.weight+=weight;bin.count++;
    if(weight>.1)bin.saturations.push(s);
    bin.samples.push({rgb:c,s,l,weight});
    c.forEach((v,k)=>bin[(['r','g','b'] as const)[k]]+=v*weight);chromatic++;
  }
  if(!visible)return null;
  const average=bubble.hex(total.map(c=>c/visible));
  if(chromatic/visible<.025)return {neutral:average,colors:[]};
  const candidates=bins.map((_,index)=>{
    const members=bins.map((b,j)=>({b,j})).filter(({b,j})=>b.weight&&hueDistance(j*10,index*10)<=10);
    const weight=members.reduce((v,{b})=>v+b.weight,0);
    let rgb=(['r','g','b'] as const).map(k=>weight?members.reduce((v,{b})=>v+b[k],0)/weight:0);
    const saturations=members.flatMap(({b})=>b.saturations).sort((a,b)=>a-b);
    const chroma=saturations[Math.floor((saturations.length-1)*.9)]||hslOf(bubble.hex(rgb))[1];
    const accents=members.flatMap(({b})=>b.samples).filter(p=>p.s>=chroma*.85&&p.l>.32&&p.l<.86);
    const accentWeight=accents.reduce((v,p)=>v+p.weight,0);
    if(accentWeight)rgb=[0,1,2].map(k=>accents.reduce((v,p)=>v+p.rgb[k]*p.weight,0)/accentWeight);
    const color=bubble.hex(rgb),[h,s,l]=hslOf(color);
    const score=Math.pow(weight,.25)*Math.pow(chroma,3);
    return {color,h,s,l,weight,chroma,score};
  }).filter(c=>c.weight>0);
  const largestWeight=Math.max(...candidates.map(c=>c.weight));
  const warm=(c: MemoryRepresentativeColor)=>c.h>8&&c.h<50&&c.l>.42;
  // In portraits, a large central warm skin-like area is a supporting color.
  // Keep it when no substantial alternative family exists (e.g. a peach-only avatar).
  if(centralWarm/visible>.07&&candidates.some(c=>!warm(c)&&c.weight>largestWeight*.18)) {
    for(const c of candidates)if(warm(c))c.score*=.2;
  }
  candidates.sort((a,b)=>b.score-a.score);
  const colors: MemoryRepresentativeColor[]=[];
  for(const c of candidates) {
    if(c.weight<largestWeight*.03)continue;
    if(colors.every(old=>hueDistance(c.h,old.h)>32))colors.push(c);
    if(colors.length===3)break;
  }
  return {neutral:average,colors};
}
const paletteCache=new Map<string, Promise<MemoryColorSample | null>>();
export function extractMemoryColors(src: string): Promise<MemoryColorSample | null> {
  if(typeof window === "undefined" || !src)return Promise.resolve(null);
  const cached=paletteCache.get(src);if(cached)return cached;
  const result=new Promise<MemoryColorSample | null>(resolve=>{
    const img=new Image();img.crossOrigin='anonymous';let settled=false;
    const finish=(value: MemoryColorSample | null)=>{if(settled)return;settled=true;clearTimeout(timer);img.onload=img.onerror=null;resolve(value);};
    const timer=setTimeout(()=>finish(null),8000);img.onerror=()=>finish(null);
    img.onload=()=>{
      try {
        const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return finish(null);
        const side=Math.min(img.naturalWidth,img.naturalHeight);
        ctx.beginPath();ctx.arc(32,32,32,0,Math.PI*2);ctx.clip();
        ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,64,64);
        finish(representativeColors(ctx.getImageData(0,0,64,64).data));
      }catch{finish(null);}
    };img.src=src;
  });
  if(paletteCache.size>=64)paletteCache.delete(paletteCache.keys().next().value!);
  paletteCache.set(src,result);return result;
}
export function memoryPalette(sample: MemoryColorSample,dark: boolean): string[] {
  if(!sample.colors.length) {
    const [, ,l]=hslOf(sample.neutral);
    const light=dark?[.22,.28,.25,.19,.31]:[.965,.865,.925,.99,.825].map(v=>v+Math.min(.025,l*.025));
    return light.map(v=>hslColor(0,0,v));
  }
  const primary=sample.colors[0],secondary=sample.colors[1]||primary;
  // Five pastel roles from the sampled families, including the photograph's warm/cool supporting color.
  const make=(c: MemoryRepresentativeColor,scale: number,l: number)=>hslColor(c.h,Math.min(.58,Math.max(.12,(c.s*.35+c.chroma*.65)*scale)),l);
  if(dark)return [make(primary,.55,.23),make(primary,.65,.29),make(secondary,.5,.26),make(secondary,.3,.2),make(primary,.58,.32)];
  return [make(primary,.42,.94),make(primary,.68,.82),make(secondary,.45,.91),make(secondary,.28,.975),make(primary,.58,.865)];
}

export function defaultMemoryPalette(dark: boolean): string[] {
    return dark ? ["#2b3d4c", "#344f65", "#304b56", "#423e30", "#334c62"]
        : ["#e3f1fb", "#a8d0ef", "#c1e4f3", "#fff9e6", "#99c3e4"];
}

export function memoryPaletteText(color: string, dark: boolean): { text: string; muted: string } {
    const luminance = (c: string) => rgb(c).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
        .reduce((value, n, i) => value + n * [.2126, .7152, .0722][i], 0);
    const surfaceLum = luminance(color);
    const contrast = (candidate: string) => (Math.max(surfaceLum, luminance(candidate)) + .05) / (Math.min(surfaceLum, luminance(candidate)) + .05);
    let muted = ink(color);
    for (let weight = .26; weight >= .1; weight -= .04) {
        const candidate = mix(dark ? "#ffffff" : "#101012", color, weight);
        if (contrast(candidate) >= 4.5) { muted = candidate; break; }
    }
    const main = dark ? "#edf3f7" : "#263d4e";
    return { text: contrast(main) >= 4.5 ? main : ink(color), muted };
}
