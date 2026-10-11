# NAKIŞ Studio — hareket düzenleme

Bu geliştirme, mevcut geometrileri zaman çizelgesinde kullanılabilir hale getirir. Geometri çekirdeğinin tüm matematiksel doğruluğunu kanıtladığı iddia edilmez; mevcut parça üreticileri korunmuştur. WAC sembolünün üç SVG yüzeyi ve oranları değişmez.

## Kullanım

### Geometrik üretim

Parçayı seçin ve **Geometri** sekmesini açın. Parçalar bölümünde de aynı üç işlem düğmesi bulunur. İlk işlem otomatik deney kopyası oluşturur; kaynak katman gizlenir ve ayrı tutulur. Geri al veya katman görünürlüğüyle kaynağa dönebilirsiniz.

- **Üçgenden üret:** kapalı yüzey Earcut ile üçgenlere ayrılır. W için altı üçgen vardır. Sıfırda tüm yüzeyler tek bir başlangıç üçgeninin üst üste duran kopyalarıdır. Üçgen → şekil sürgüsü, her kopyayı hedef üçgenine afin dönüşümle taşır. Birde özgün W sınırlarına dönülür. Üretimi oynat otomatik anahtar kareler oluşturur.
- **Fraktal zincire sok:** her nesilde, katmanın döndürülmüş ve küçültülmüş iki kopyası üretilir. Nesil, küçülme oranı, dallanma açısı, aralık ve büyüme ayarlanır. Zincirin büyümesini oynat anahtar kareleri hazırlar. En fazla beş nesil ve 50.000 kaynak noktası bütçesi uygulanır; çok karmaşık parçalar için etkin nesil azaltılır. Bu sonlu bir kendine benzer geometrik zincirdir.
- **Katla / aç:** üçgen komşuları ortak kenarlarından 3B menteşe dönüşümleriyle katlanır ve perspektifle 2B tuvale aktarılır. Katlanma ve açı ayarlanır. Katla ve açmayı oynat açık → katlı → açık anahtar karelerini oluşturur. Panellerin 3B kenar uzunlukları korunur. Bu, kâğıt kalınlığı veya yüzey çarpışması içeren fiziksel origami simülasyonu değildir. W'nin üç bağlantısız yüzeyi ayrı katlanır.
- Üçgen / kat çizgileri isteğe bağlı gösterilir. Yüzey üretimi veya katlama, fraktal zincirle birlikte kullanılabilir. Üretim, katlanma ve büyüme değerleri Hareket sekmesinde anahtar kareye kaydedilir; JSON ve SVG/PNG/video çıktılarında aynı geometri kullanılır.

Yüzey üretimi ve katlama, parça başına en fazla 256 noktalı basit kapalı yüzeyler için uygulanır; açık çizgiler zincire alınabilir. İçe aktarılan rastgele poligonlar için genel doğruluk garantisi verilmez.

1. Parçalar bölümünden bir kompozisyon seçin veya `Moving Geometry` hazır örneğini açın.
2. Hareket sekmesini açın. Katman satırından düzenlenecek parçayı seçin.
3. Zamanı belirleyin; X, Y, boyut, dönüş, görünürlük ve çizim ilerlemesini ayarlayın. Tuval üzerinde sürükleme de geçici pozu değiştirir.
4. **Anahtar kare ekle / güncelle** ile pozu kaydedin. Sadece sürgüyü değiştirmek kalıcı anahtar kare oluşturmaz.
5. Başka bir zaman seçin ve ikinci pozu kaydedin. Geçiş eğrisi başlangıç anahtarından sonraki anahtara uygulanır.
6. **Çıktıda bu zaman çizelgesini kullan** açıkken oynatma ve kayıt katman hareketini kullanır. Kapalıyken eski motiften-kumaşa film akışı kullanılır.

İki başlangıç yolu: `studio.html?preset=motionstudy` veya `studio.html?p=projects/moving-geometry.json`. WAC logosu için `studio.html?preset=wac`.

## Araçlar

- Katman başına 128 anahtar kare; zaman çizelgesinde atlama, kayıt güncelleme ve silme.
- Doğrusal, akıcı, hızlanan, yavaşlayan, yumuşak giriş/çıkış ve bekleme geçişleri. `bezier-easing` gerçek cubic Bézier zamanlamasını hesaplar.
- Saydam önceki/sonraki anahtar kare önizlemesi. PNG ve video çıktısına hayaletler veya düzenleme kılavuzları eklenmez.
- Süre değiştirilince anahtar kare zamanları orantılı ölçeklenir. Süre 2–60 saniyedir; döngü yalnızca önizleme için geçerlidir, kayıt bir turdur.
- 60 durumluk geri al/ileri al. Ctrl/⌘ Z, Ctrl/⌘ Shift Z ve Ctrl/⌘ Y. Boşluk oynatır/duraklatır; metin alanında yazmayı etkilemez.
- SVG geometrisi dışa aktarımı. İsteğe bağlı `simplify-js` yalnızca açık, markaya ait olmayan çizgileri 0.35 tuval pikseli toleransla hafifletir. Kapalı yüzeylere ve WAC sembolüne uygulanmaz.
- Açık çizginin ilerlemesi toplam yay uzunluğuna göre hesaplanır. Kapalı yüzeyler geometriyi bozmadan saydamlıkla belirir.
- Proje dosyaları eski biçimle uyumludur; hareket ayarları ve anahtar kareler JSON'a dahil edilir. İçe alımda boyut, renk, sayı, katman ve anahtar kare sınırları kontrol edilir.
- Kayıt biçimi tarayıcı desteğine göre seçilir; kayıt sırasında düzenleme kilitlenir. Kaydı bitir ve sekme gizleme kısmi kaydı sonlandırır. Kare hızı 30 fps hedeflidir; MediaRecorder gerçek zamanda kare atlayabilir.
- Başlangıçta otomatik hareket yoktur. Düşük hareket tercihi etkinleştirildiğinde oynatma durur; açık kullanıcı isteğiyle oynatılabilir.

## Kaynak araştırması ve lisanslar

| Araç | Değerlendirme |
| --- | --- |
| [Theatre.js](https://github.com/theatre-js/theatre) | Genel hareket editörü. Kendi editörü ve proje modeli mevcut NAKIŞ panelini büyük ölçüde değiştireceği için bu sürümde eklenmedi. |
| [Motion](https://github.com/motiondivision/motion) | Web arayüz hareketleri için uygun. Canvas geometrisi ve dışarıdan deterministik kare üretimi için gerekli değildi. |
| [Tween.js](https://github.com/tweenjs/tween.js) | Sayısal değer animasyonu. Mevcut `renderAt(t)` mimarisi için durumdan bağımsız doğrudan zaman örneklemesi seçildi. |
| [bezier-easing](https://github.com/gre/bezier-easing) | v2.1.0, MIT; anahtar kareler arasında cubic Bézier zaman eğrileri. Entegre edildi. |
| [simplify-js](https://github.com/mourner/simplify-js) | v1.2.4, BSD-2-Clause; isteğe bağlı açık SVG çizgisi optimizasyonu. Entegre edildi. |
| [Earcut](https://github.com/mapbox/earcut) | v3.0.2, ISC; kapalı yüzeylerin üçgen ağına ayrılması. Entegre edildi. |

Bağımlılıklar `vendor/` altında yereldir. Lisanslar ve sabit kaynak blob SHA'ları aynı dizinde tutulur. CDN veya servis hesabı gerekmez.

## Kontrol ve sınırlar

`node --test tests/studio.test.mjs` çalıştırılır. Test adaptörü gerçek NAKIŞ modülünü ve `@napi-rs/canvas` çizimini çalıştırır. Test bağımlılığı: `npm install --no-save @napi-rs/canvas`. Tarayıcıya dağıtılan sayfa bu paketi gerektirmez.

Yay uzunluğu, anahtar kare sınırları, bekleme eğrisi, zamandan bağımsız örnekleme, proje sınırları, geri al/ileri al, katman kopyalama, süre ölçekleme, SVG optimizasyonu, WAC geometrisi, gerçek Canvas çıktısının tekrarlanabilirliği ve eski film davranışı test edilir. Geometri kontrolleri ayrıca üçgen alan toplamını, üretim uç durumlarını, 3B panel kenar uzunluklarını, ortak menteşe uçlarını, fraktal kopya sayılarını/oranlarını ve gerçek stüdyo düğmeleri üzerinden üretme/katlama/büyütme akışını kapsar. Toplam 14 test geçer.

Bu ortamda gerçek tarayıcı / telefon üzerinde görünüm ve MediaRecorder kodlayıcısı denenmedi. Canvas ve DOM adaptörü testleri gerçek tarayıcı testinin yerini tutmaz. SVG yalnızca tek kompozisyonun vektör geometrisini aktarır; doku, kumaşa yayılma ve film başlıkları raster film/PNG akışına aittir. Genel SVG içe alımı, karakter iskeleti ve geometriler arası morphing bu sürümün kapsamına dahil değildir.
