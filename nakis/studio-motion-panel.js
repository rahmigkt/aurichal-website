import {CHANNELS,EASINGS,normaliseKeys,poseOf,samplePose} from './studio-motion.js';
export function motionPanel(proj,selected,time,draft,ease,onion,parts,t){
 const m=proj.motion,l=proj.layers[selected],pose=l?(draft||samplePose(l,time,m.duration)):poseOf();
 const labels={x:'X',y:'Y',size:t('Boyut','Size'),rot:t('Dönüş °','Rotation °'),opacity:t('Görünürlük','Opacity'),reveal:t('Çizim ilerlemesi','Draw progress'),formation:t('Üçgen → şekil','Triangle → shape'),fold:t('Katlanma','Fold amount'),growth:t('Zincir büyümesi','Chain growth')};
 const names={linear:t('Doğrusal','Linear'),ease:t('Akıcı','Ease'),easeIn:t('Hızlanarak','Ease in'),easeOut:t('Yavaşlayarak','Ease out'),easeInOut:t('Yumuşak giriş / çıkış','Ease in/out'),hold:t('Bekle, sonra geç','Hold')};
 let h=`<h3>${t('Katman animasyonu','Layer animation')}</h3><label><input type="checkbox" data-motion="enabled" ${m.enabled?'checked':''}> ${t('Çıktıda bu zaman çizelgesini kullan','Use this timeline for output')}</label>
 <div class="ctl2"><label for="motion-duration">${t('Süre (sn)','Duration (s)')}</label><input id="motion-duration" type="number" min="2" max="60" step=".1" data-motion="duration" value="${m.duration}"></div>
 <label><input type="checkbox" data-motion="loop" ${m.loop?'checked':''}> ${t('Önizlemeyi tekrarla','Loop preview')}</label>
 <div class="btns"><button data-act="motion-start">${t('Başa dön','Rewind')}</button><button class="pri" data-act="motion-play">${t('Oynat / duraklat','Play / pause')}</button><button data-act="motion-edit">${t('Kompozisyonu düzenle','Edit composition')}</button></div>
 <div class="hint">${t('Zamanı seç → pozu ayarla → Anahtar kare ekle. Mevcut film akışı, üstteki kutu kapalıyken kullanılmaya devam eder.','Choose time → adjust pose → Add keyframe. The existing film remains available when the checkbox above is off.')}</div>
 <div class="ctl2"><label for="motion-time">${t('Zaman (sn)','Time (s)')}</label><input id="motion-time" type="number" min="0" max="${m.duration}" step=".1" data-motion="time" value="${time.toFixed(2)}"></div>
 <div class="tracks" aria-label="${t('Katman zaman çizelgesi','Layer timeline')}">`;
 proj.layers.forEach((layer,i)=>{
  const keys=normaliseKeys(layer.keys,m.duration,poseOf(layer));
  h+=`<div class="track-row"><button class="track-name ${i===selected?'active':''}" data-act="motion-layer" data-i="${i}">${i+1}. ${parts[layer.part].title}</button><div class="track"><i class="playhead" style="left:${time/m.duration*100}%"></i>${keys.map((k,j)=>`<button class="keyframe" style="left:${k.t/m.duration*100}%" data-act="motion-key" data-i="${i}" data-key-index="${j}" title="${k.t.toFixed(2)} s" aria-label="${parts[layer.part].title}, ${k.t.toFixed(2)} s">◆</button>`).join('')}</div></div>`;
 });
 h+='</div>';
 if(!l)return h+`<div class="hint">${t('Parçalar sekmesinden bir katman ekleyin.','Add a layer from Parts.')}</div>`;
 h+=`<h3>${parts[l.part].title} · ${t('Poz','Pose')}</h3>`;
 for(const [k,[min,max]] of Object.entries(CHANNELS)){
  if(['formation','fold','growth'].includes(k)&&!l.experimental)continue;
  h+=`<div class="ctl"><label for="pose-${k}">${labels[k]}</label><input id="pose-${k}" type="range" data-pose="${k}" min="${min}" max="${max}" step="${max===1?'.01':'.5'}" value="${pose[k]}"><output>${Number(pose[k].toFixed(2))}</output></div>`;
 }
 const curve=Array.from({length:41},(_,i)=>`${i?'L':'M'}${i*3} ${60-60*EASINGS[ease](i/40)}`).join(' ');
 h+=`<div class="ctl2"><label for="motion-ease">${t('Geçiş','Transition')}</label><select id="motion-ease" data-motion="ease">${Object.entries(names).map(([k,n])=>`<option value="${k}" ${k===ease?'selected':''}>${n}</option>`).join('')}</select></div>
 <svg class="ease-plot" viewBox="-4 -4 128 68" role="img" aria-label="${t('Hareket eğrisi','Easing curve')}"><path d="M0 0V60H120" fill="none" stroke="currentColor" opacity=".25"/><path d="${curve}" fill="none" stroke="currentColor" stroke-width="2"/></svg>
 <div class="hint">${t('Geçiş eğrisi bu kareden sonraki kareye uygulanır. Çizim ilerlemesi, kapalı yüzeylerde saydamlıkla; açık çizgilerde gerçek çizgi uzunluğuyla çalışır.','The curve applies from this key to the next. Draw progress fades filled shapes and traces open strokes by arc length.')}</div>
 <div class="btns"><button class="pri" data-act="motion-capture">${t('Anahtar kare ekle / güncelle','Add / update keyframe')}</button><button data-act="motion-delete">${t('Bu kareyi sil','Delete keyframe')}</button><button data-act="motion-discard">${t('Poz değişikliğini bırak','Discard pose changes')}</button></div>
 <div class="hint" id="motion-draft">${draft?t('Poz henüz kaydedilmedi. Anahtar kare ekle düğmesine basın.','Pose not saved yet. Press Add keyframe.'):t('Kaydedilmiş hareket gösteriliyor.','Showing saved motion.')}</div>
 <label><input type="checkbox" data-motion="onion" ${onion?'checked':''}> ${t('Önceki / sonraki kareyi soluk göster','Ghost previous / next keyframe')}</label>
 <h3>${t('Hareket örneği','Motion example')}</h3><button data-act="motion-example">${t('Seçili katmana sakin döngü ekle','Add gentle loop to selected layer')}</button>
 <div class="hint">${t('Örnek, seçili katmanın anahtar karelerini değiştirir. Geri al ile dönebilirsiniz.','The example replaces the selected layer’s keys. Undo restores them.')}</div>`;
 return h;
}
