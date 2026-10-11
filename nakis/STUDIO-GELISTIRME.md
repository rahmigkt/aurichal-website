# NAKIŞ Studio — hareket düzenleme

Bu geliştirme, mevcut geometrileri zaman çizelgesinde kullanılabilir hale getirir. Geometri çekirdeğinin tüm matematiksel doğruluğunu kanıtladığı iddia edilmez; mevcut parça üreticileri korunmuştur. WAC sembolünün üç SVG yüzeyi ve oranları değişmez.

## Kullanım

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

Bağımlılıklar `vendor/` altında yereldir. Lisanslar ve sabit kaynak blob SHA'ları aynı dizinde tutulur. CDN veya servis hesabı gerekmez.

## Kontrol ve sınırlar

`node --test tests/studio.test.mjs` çalıştırılır. Test adaptörü gerçek NAKIŞ modülünü ve `@napi-rs/canvas` çizimini çalıştırır. Test bağımlılığı: `npm install --no-save @napi-rs/canvas`. Tarayıcıya dağıtılan sayfa bu paketi gerektirmez.

Yay uzunluğu, anahtar kare sınırları, bekleme eğrisi, zamandan bağımsız örnekleme, proje sınırları, geri al/ileri al, katman kopyalama, süre ölçekleme, SVG optimizasyonu, WAC geometrisi, gerçek Canvas çıktısının tekrarlanabilirliği ve eski film davranışı test edilir.

Bu ortamda gerçek tarayıcı / telefon üzerinde görünüm ve MediaRecorder kodlayıcısı denenmedi. Canvas ve DOM adaptörü testleri gerçek tarayıcı testinin yerini tutmaz. SVG yalnızca tek kompozisyonun vektör geometrisini aktarır; doku, kumaşa yayılma ve film başlıkları raster film/PNG akışına aittir. Genel SVG içe alımı, karakter iskeleti ve geometriler arası morphing bu sürümün kapsamına dahil değildir.
