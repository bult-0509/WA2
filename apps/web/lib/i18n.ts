export type Locale='en'|'zh';
export function pick(locale:Locale,en:string,zh:string){return locale==='zh'?zh:en;}
export function displayCategory(locale:Locale,value:string){const zh:Record<string,string>={'Bowling':'保龄球','Balance & coordination':'平衡与协调','Outdoor games':'户外游戏'};return locale==='zh'?(zh[value]||value):value;}
export function displayEnvironment(locale:Locale,value:string){const labels:Record<string,string>={indoor:'室内',outdoor:'户外',both:'室内与户外'};return locale==='zh'?(labels[value]||value):(value==='both'?'Indoor & outdoor':value.charAt(0).toUpperCase()+value.slice(1));}
export function localizeDefaultContent(locale:Locale,value:string){
 if(locale==='en')return value;const defaults:Record<string,string>={
  'Make room for play.':'为快乐运动，留出空间。','Explore movement, balance and time together.':'在运动与平衡中，享受共同玩耍的时光。',
  'WEMOVE SPORTS brings movement and play into everyday life. Browse the collection or contact our team with a product question.':'WEMOVE SPORTS 把运动和玩耍带进日常生活。浏览产品系列，或联系我们咨询产品。','Explore products':'浏览产品'};
 return defaults[value]||value;
}
export function localizeApiMessage(locale:Locale,value:string){
 if(locale==='en')return value;const known:Record<string,string>={'Please check the highlighted fields.':'请检查标出的字段。','Please try again.':'请稍后重试。','Request failed.':'请求失败。','Please sign in.':'请先登录。','Sign-in failed.':'登录失败。','This SKU or URL already exists.':'该 SKU 或网址已存在。','Request origin could not be verified.':'无法验证请求来源。'};return known[value]||value;
}
