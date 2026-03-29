<p align="center">
<img src="./Basemark.png" alt="Base logo" width="480" />
</p>

<!-- Rozet satırı 1 - durum -->

[![GitHub contributors](https://img.shields.io/github/contributors/base/docs)](https://github.com/base/docs/graphs/contributors)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/base/docs)](https://github.com/base/docs/graphs/contributors)
[![GitHub Stars](https://img.shields.io/github/stars/base/docs.svg)](https://github.com/base/docs/stargazers)
![GitHub repo size](https://img.shields.io/github/repo-size/base/docs)
[![GitHub](https://img.shields.io/github/license/base/docs?color=blue)](https://github.com/base/docs/blob/main/LICENSE.md)

<!-- Rozet satırı 2 - bağlantılar ve profiller -->

[![Website base.org](https://img.shields.io/website-up-down-green-red/https/base.org.svg)](https://base.org)
[![Blog](https://img.shields.io/badge/blog-up-green)](https://base.mirror.xyz/)
[![Docs](https://img.shields.io/badge/docs-up-green)](https://docs.base.org/)
[![Discord](https://img.shields.io/discord/1067165013397213286?label=discord)](https://base.org/discord)
[![Twitter Base](https://img.shields.io/twitter/follow/Base?style=social)](https://twitter.com/Base)

<!-- Rozet satırı 3 - detaylı durum -->

[![GitHub pull requests by-label](https://img.shields.io/github/issues-pr-raw/base/docs)](https://github.com/base/docs/pulls)
[![GitHub Issues](https://img.shields.io/github/issues-raw/base/docs.svg)](https://github.com/base/docs/issues)

Base Docs topluluk tarafından yönetilmektedir. Bu belgelerin doğru, yardımcı ve güncel kalması için herkesten katkı bekliyoruz.

> Not: Bu depo, kamuya açık Base dokümantasyon sitesini desteklemektedir. İçerik `docs/` klasörü altında yer almaktadır.

## Yerel Geliştirme

Ön koşul: Node.js v19+.

1. Depoyu klonlayın.
2. Dokümantasyon değişikliklerini yerel olarak önizlemek için Mint CLI'yi yükleyin:

```bash
npm i -g mint
```

3. Yerel olarak önizleme yapın (`docs.json` dosyasının bulunduğu `docs/` dizininden çalıştırın):

```bash
cd docs
mint dev
```

Alternatif olarak, global kurulum olmadan:

```bash
npx mint dev
```

### Sorun Giderme

- Node.js v19+'nın yüklü olduğundan ve `mint dev` komutunu `docs.json` dosyasını içeren dizinden (genellikle `docs/`) çalıştırdığınızdan emin olun.
- Yerel önizleme üretim ortamından farklı olabilir: CLI'yi güncellemek için `mint update` komutunu çalıştırın.

## Nasıl Katkıda Bulunulur

1. **Fork ve branch oluşturun**: `base/docs`'u fork'layın ve değişikliğiniz için açıklayıcı bir branch oluşturun.
2. **`docs/` içindeki içeriği düzenleyin**: Aşağıdaki yapı ve stil kılavuzunu takip edin. Mint CLI ile yerel olarak önizleyin.
3. **Pull request açın**: Net bir özet ve ilgili sayfalara bağlantılar sağlayın. Docs ekibi ve topluluk inceleyecektir.

> İpucu: Küçük ve odaklanmış PR'lar tercih edilir. İçeriğinizde ilgili kılavuzları ve referansları doğrudan bağlayın.

## Dokümantasyon Yapısı

### Temel İlke: Mevcut Yapıyı Koruyun

> Uyarı: Yeni üst düzey bölümler oluşturmayın. Tüm yeni içerikleri `docs/` altındaki mevcut klasörlere yerleştirin.

Base dokümantasyonu yerleşik bölümler halinde düzenlenmiştir (örneğin: `get-started/`, `learn/`, `base-account/`, `base-app/`, `base-chain/`, `cookbook/`, `mini-apps/`, `onchainkit/`). Yeni içerikleri en uygun mevcut bölüme yerleştirin.

### Navigasyon Politikası

> Not: Genel olarak, açık ve geniş çaplı bir fayda sağlamadıkça küresel navigasyonu (üst düzey sekmeler) veya kenar çubuğu bölümlerini değiştirmiyoruz. Katkılar, mevcut sayfaları iyileştirmeye ve mevcut bölümler içinde yeni sayfalar eklemeye odaklanmalıdır.

### Bölüm Amacı ve Yerleşimi

- **Hızlı Başlangıç**: İlk başarıya ulaşmak için uçtan uca kurulum. Kısa ve güncel tutun.
- **Kavramlar**: Bileşenlerin, mimarinin ve tasarım felsefesinin açıklamaları.
- **Kılavuzlar**: Belirli görevler için adım adım, eylem odaklı eğitimler.
- **Örnekler**: Gerçek dünya kullanımını gösteren eksiksiz, çalıştırılabilir örnekler.
- **Teknik Referans**: Parametreler ve dönüş tipleri içeren API/metot/bileşen özellikleri.
- **Katkıda Bulun**: Katkıda bulunanlar için bilgiler ve süreç güncellemeleri.

#### Cookbook Kapsamı

- `cookbook/` bölümü, ürüne özgü belgeler değil, kullanım senaryosuna odaklı kılavuzlara ve kalıplara ev sahipliği yapar.
- Araçlar ve senaryolar genelinde Base üzerinde nasıl inşa edileceğini gösteren çapraz kesimli çözümleri tercih edin.

> Uyarı: Alt bölüm çoğalmasından kaçının:
> - Tüm kılavuzları Kılavuzlar bölümünde aynı seviyede tutun.
> - Referansı kullanım senaryosuna göre değil, bileşen/özelliğe göre düzenleyin.
> - Yeni yapısal katmanlar eklemek yerine çapraz bağlantılar kullanın.

## Stil ve Biçimlendirme

### Yazı Stili

1. Kısa ve tutarlı olun; etkin ses ve ikinci şahıs kullanın.
2. Mutlu yola odaklanın; alternatifleri kısaca belirtin.
3. Açık ve açıklayıcı başlıklar ve dosya adları kullanın.
4. Tutarlı terminoloji kullanın; kısaltmaları ilk kullanımda tanıtın.

### Yapay Zeka Dostu İçerik

- Net ve açık bir dil kullanın, ilgili sayfaları doğrudan bağlayın.
- Sıralı olmayan seçenekler/adımlar için madde işaretli listeler tercih edin.
- Kütüphaneleri ve araçları açıkça adlandırın ve referans gösterin.
- Anlamlı, okunabilir URL'ler kullanın; belirsiz kısaltmalardan kaçının.

> Kontrol Listesi:
> - Bir Büyük Dil Modeli bu içeriği anlayıp takip edebilir mi?
> - Bir mühendis örnekleri doğrudan kopyalayıp çalıştırabilir mi?

### Mintlify Biçimlendirmesi

- Ana bölümleri H2 (`##`) ile, alt bölümleri H3 (`###`) ile başlatın.
- Dil ve isteğe bağlı dosya adı içeren çit kod blokları kullanın.
- Görüntüleri `<Frame>` ile sarın ve `alt` metni ekleyin.
- Vurgu için açıklama kutuları kullanın: `<Note>`, `<Tip>`, `<Warning>`, `<Info>`, `<Check>`.
- Prosedürler için `<Steps>` / `<Step>` tercih edin.
- Alternatifler için `<Tabs>` / `<Tab>` kullanın.
- API belgeleri için `<ParamField>`, `<ResponseField>` ve istek/yanıt örnekleri kullanın.

### Kod Örnekleri

- Gerçekçi verilerle eksiksiz, çalıştırılabilir örnekler sağlayın.
- Uygun hata yönetimi ve sınır durumlarını dahil edin.
- Gerektiğinde dil ve dosya adı belirtin.
- Beklenen çıktı veya doğrulama adımlarını gösterin.

## Üçüncü Taraf Kılavuz Politikası

> Uyarı: Genel olarak, öncelikli olarak üçüncü taraf ürünleri belgeleyen kılavuzları kabul etmiyoruz. İstisnalar, Base'e odaklı net bir kullanım senaryosu ve Base ürünleriyle sıkı bir entegrasyon gerektirir. Yalnızca Base üzerinde dağıtmak veya Base Account/Base App'e bağlanmak yeterli değildir.

Ürününüzün keşfedilebilirliğini artırmak istiyorsanız, lütfen Base Ekosistem sayfasına dahil edilmeyi talep edin. [Base Ekosistem sayfasını güncelleme](https://github.com/base/web?tab=readme-ov-file#updating-the-base-ecosystem-page) talimatlarına bakın.

## İnceleme Kontrol Listesi (PR Göndermeden Önce)

- [ ] Mevcut yapıya uyuyor (yeni üst düzey bölüm yok)
- [ ] Yalnızca gerekli, minimal alt bölümler
- [ ] Tutarlı terminoloji; kısaltmalar ilk kullanımda tanıtılmış
- [ ] Kod örnekleri eksiksiz, çalıştırılabilir ve doğrulanmış
- [ ] İlgili kılavuzlara/örneklere/referanslara çapraz bağlantılar eklenmiş
- [ ] Mintlify bileşenleri ve başlık hiyerarşisi doğru kullanılmış
- [ ] Açıklayıcı `alt` metni ve çerçeveleri olan erişilebilir görüntüler
- [ ] Yapay zeka dostu: açık, bağlantı zengin ve takip etmesi kolay

## Gönderim Süreci

1. Değişikliklerinizle `https://github.com/base/docs` adresine bir PR oluşturun.
2. Değişikliğin ve etkilenen sayfaların net bir açıklamasını ekleyin.
3. Docs ekibinden inceleme isteyin.
4. Geri bildirimleri ele alın ve iyileştirin.
5. Onaylandıktan sonra değişiklikler birleştirilip yayınlanacaktır.

## Değişiklikleri Yayınlama

Çekirdek ekip açılan PR'ları inceleyecektir. SLA, acil değişiklikler dışında genellikle ilk gelene ilk hizmet esasıyla 2 haftadır.

## UI Bileşenleri için Storybook

Yerel Storybook ve bileşen belgeleri hakkında ayrıntılar için `storybook/README.md` dosyasına bakın.
