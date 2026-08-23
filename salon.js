// MUKANTARA — Sanal Salon prototipi
// Motor: Immersions (Babylon.js) — Apache 2.0, bkz. LICENSE / NOTICE
// Bu dosya sadece MİMARİ (oda, ışık, malzeme, kaide düzeni) tanımlıyor.
// Sergilenen objelerin kendisi (Halkalı Küre, usturlaplar) henüz CAD/foto­grametri
// verisi olmadığı için burada KUTU yer tutucu olarak duruyor — ileride
// gerçek 3D taramayla değiştirilecek (bkz. attachMesh / setExhibit).

class MukantaraSalon extends Immersion {
  constructor(engine) {
    console.log("MUKANTARA SALON — build v4 (gömülü araçlar, sade duvarlar)");
    const config = {
      viewHeight: 1.75,
      skyboxSize: 300,
      // MUKANTARA marka paleti: --wall koyu yeşil-siyah tonu
      skyColor: new BABYLON.Color3(0.03, 0.05, 0.075),
      fogDensity: 0.006,
      fogColor: new BABYLON.Color3(0.03, 0.05, 0.075),
      groundSize: 40,
    };
    super("mukantaraSalon", "dark", engine, config);

    // -- Zemin: sade koyu lacivert-teal, hareketli doku yok (duvar dokusu rahatsız ediciydi) --
    this.ground.material.diffuseColor = new BABYLON.Color3(0.03, 0.05, 0.08);
    this.ground.material.specularColor = new BABYLON.Color3(0, 0, 0);

    // -- Kaide malzemesini pirinç/altın rengine çeviriyoruz --
    // ("dark" stil kullanan tüm plinth/display bu malzemeyi paylaşır)
    this.darkPlinthMaterial.diffuseColor = new BABYLON.Color3(0.663, 0.475, 0.235); // brass
    this.darkPlinthMaterial.specularColor = new BABYLON.Color3(0.78, 0.6, 0.36);
    this.darkPlinthMaterial.specularPower = 64;
    this.darkPlinthMaterial.ambientColor = new BABYLON.Color3(0.2, 0.14, 0.07);

    // -- Işıklar: loş genel aydınlatma + kaidelere sıcak spot --
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this);
    hemi.intensity = 0.55;
    hemi.diffuse = new BABYLON.Color3(0.9, 0.87, 0.78);
    hemi.groundColor = new BABYLON.Color3(0.08, 0.08, 0.07);

    this.shadowLight = new BABYLON.DirectionalLight("shadowLight", new BABYLON.Vector3(-0.3, -1, 0.2), this);
    this.shadowLight.intensity = 0.6;
    this.shadowLight.diffuse = new BABYLON.Color3(1, 0.85, 0.6);
    this.shadowGenerator = new BABYLON.ShadowGenerator(1024, this.shadowLight);
    this.shadowGenerator.useExponentialShadowMap = true;
    this.setupShadows(this.shadowGenerator, true);

    // her kaide için sıcak, dar bir spot ışık (müze vitrin hissi)
    const spotPositions = [
      new BABYLON.Vector3(-3, 4, -6),
      new BABYLON.Vector3(0, 4, -6),
      new BABYLON.Vector3(3, 4, -6),
    ];
    spotPositions.forEach((pos, i) => {
      const spot = new BABYLON.SpotLight(
        "spot" + i, pos,
        new BABYLON.Vector3(0, -1, 0.15),
        Math.PI / 4, 8, this,
      );
      spot.diffuse = new BABYLON.Color3(1, 0.86, 0.62);
      spot.intensity = 45;
    });

    // -- Galeri mimarisi: giriş koridoru + ilk salon + gelecekteki salonlara açık kapı --
    // Çok-odalı galerinin ilk parçası. Yeni salonlar eklendikçe bu fonksiyonlarla
    // (createCorridor / createRoomWithDoorway) genişletilecek — tek dosyadan yönetilebilir.
    // -- Duvarlar: sade koyu düz renk (devre deseni ekranlara taşındı — duvarda
    // yaklaşırken/uzaklaşırken rahatsız edici hareket yapıyordu) --
    this.wallMat = new BABYLON.StandardMaterial("wallMat", this);
    this.wallMat.diffuseColor = new BABYLON.Color3(0.03, 0.05, 0.08);
    this.wallMat.specularColor = new BABYLON.Color3(0, 0, 0);
    this.wallH = 4.2;

    // Giriş koridoru: dar, salon öncesi geçiş hissi (z: 15 → 6)
    this.createCorridor(0, 15, 6, 4);

    // Koridor için ek aydınlatma (girişten salona kadar tamamen karanlık kalmasın)
    const corridorLight = new BABYLON.PointLight("corridorLight", new BABYLON.Vector3(0, 3.8, 10), this);
    corridorLight.diffuse = new BABYLON.Color3(0.9, 0.85, 0.7);
    corridorLight.intensity = 20;

    // Ana salon: 14x12, arka duvarın ortasında 3m'lik kapı boşluğu bırakılıyor
    // (gelecekteki 2. salona geçiş için — henüz o taraf boş/karanlık)
    this.createRoomWithDoorway({
      centerX: 0, frontZ: 6, backZ: -6, width: 14,
      doorwayX: 5, doorwayWidth: 2.4, doorwayHeight: 2.6,
    });

    // -- Duvar ekranları: her kaidenin arkasında, tıklanınca ilgili dijital aracı
    // AYNI SAYFA İÇİNDE (yeni sekmede değil) gömülü katman olarak açan panel.
    // Gerçek MUKANTARA enstalasyonları — bkz. tools/ klasörü.
    this.createWallScreen(-3, -5.85, "Tûsî Çifti", "İncele →", "tools/tusi-cifti.html");
    this.createWallScreen(0, -5.85, "Halazûn", "İncele →", "tools/halazun.html");
    this.createWallScreen(3, -5.85, "İbn Heysem Problemi", "İncele →", "tools/ibn-heysem.html");

    // -- Camlı vitrin: referans görseldeki merkezi cam kutu denemesi --
    // Şimdilik sadece orta kaidede (x=0) — konsept onaylanırsa diğerlerine uygulanır.
    this.createVitrine(0, -3.5, { baseY: 0, width: 1.3, depth: 1.3, height: 2.1 });

    this.glow = new BABYLON.GlowLayer("glow", this, { mainTextureSamples: 2 });
    this.glow.intensity = 0.7;
    this.createAzimuthHologram(-3, -3.5, 1.35);
  }

  // Basit prosedürel PCB/devre kartı deseni: koyu zemin üstünde dik açılı,
  // düğüm noktalı parlayan çizgiler. GlowLayer sahnede zaten aktif olduğu için
  // burada ekstra blur/bulanıklaştırma yapmaya gerek yok — ışıma otomatik oluşuyor.
  createCircuitTexture(name, { size = 1024, density = 40, lineWidth = 2, color = "#3ddbe8", bg = "#03080a" } = {}) {
    const dt = new BABYLON.DynamicTexture(name, size, this, false);
    const ctx = dt.getContext();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i < density; i++) {
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 2 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segs; s++) {
        if (Math.random() < 0.5) x += (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 90);
        else y += (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 90);
        x = Math.max(8, Math.min(size - 8, x));
        y = Math.max(8, Math.min(size - 8, y));
        ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.5 + Math.random() * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return dt;
  }

  // Camlı vitrin kutusu: hafif saydam cam + parlayan kenar çizgileri (edges rendering).
  createVitrine(x, z, { baseY = 0, width = 1.3, depth = 1.3, height = 2.1 } = {}) {
    const glassMat = new BABYLON.StandardMaterial("glassMat_" + x, this);
    glassMat.diffuseColor = new BABYLON.Color3(0.5, 0.85, 0.95);
    glassMat.alpha = 0.08;
    glassMat.specularColor = new BABYLON.Color3(0.6, 0.9, 1);
    glassMat.backFaceCulling = false;

    const box = BABYLON.MeshBuilder.CreateBox("vitrine_" + x, { width, height, depth }, this);
    box.position = new BABYLON.Vector3(x, baseY + height / 2, z);
    box.material = glassMat;
    box.isPickable = false;
    box.checkCollisions = false;
    box.enableEdgesRendering();
    box.edgesWidth = 3.5;
    box.edgesColor = new BABYLON.Color4(0.4, 0.9, 1, 1);
    return box;
  }

  // Küreden (enlem/boylam kafesi + yıldız noktaları) aşağı, taban dairesine
  // (eşmerkezli çemberler + ışınsal çizgiler) yakınsayan azimut çizgileri hologramı.
  createAzimuthHologram(x, z, baseY) {
    const cyan = new BABYLON.Color4(0.35, 0.85, 0.95, 1);
    const cyanMat = new BABYLON.StandardMaterial("holoMat_" + x, this);
    cyanMat.emissiveColor = new BABYLON.Color3(0.35, 0.85, 0.95);
    cyanMat.disableLighting = true;
    cyanMat.alpha = 0.85;

    const holoRoot = new BABYLON.TransformNode("holoRoot_" + x, this);
    holoRoot.position = new BABYLON.Vector3(x, 0, z);

    const sphereY = baseY + 1.25, sphereR = 0.55;
    const circleY = baseY + 0.55, circleR = 0.95;

    // Küre kafesi: enlem + boylam çizgileri
    const latLines = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      const rr = sphereR * Math.cos(BABYLON.Tools.ToRadians(lat));
      const yy = sphereY + sphereR * Math.sin(BABYLON.Tools.ToRadians(lat));
      for (let a = 0; a <= 360; a += 10) {
        pts.push(new BABYLON.Vector3(rr * Math.cos(BABYLON.Tools.ToRadians(a)), yy, rr * Math.sin(BABYLON.Tools.ToRadians(a))));
      }
      latLines.push(pts);
    }
    for (let lon = 0; lon < 180; lon += 30) {
      const pts = [];
      for (let a = 0; a <= 360; a += 10) {
        const rad = BABYLON.Tools.ToRadians(a);
        pts.push(new BABYLON.Vector3(
          sphereR * Math.cos(rad) * Math.cos(BABYLON.Tools.ToRadians(lon)),
          sphereY + sphereR * Math.sin(rad),
          sphereR * Math.cos(rad) * Math.sin(BABYLON.Tools.ToRadians(lon)),
        ));
      }
      latLines.push(pts);
    }
    const sphereGrid = BABYLON.MeshBuilder.CreateLineSystem("holoSphere_" + x, { lines: latLines }, this);
    sphereGrid.color = cyan; sphereGrid.parent = holoRoot; sphereGrid.applyFog = false;

    // Yıldız noktaları (küre yüzeyinde rastgele küçük ışık noktaları)
    for (let i = 0; i < 22; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      const star = BABYLON.MeshBuilder.CreateSphere("star_" + x + "_" + i, { diameter: 0.025 }, this);
      star.position = new BABYLON.Vector3(
        sphereR * Math.sin(phi) * Math.cos(theta),
        sphereY + sphereR * Math.cos(phi) * 0.999,
        sphereR * Math.sin(phi) * Math.sin(theta),
      );
      star.material = cyanMat;
      star.parent = holoRoot;
      star.applyFog = false;
    }

    // Koni çizgileri: küre alt yarımından taban dairesine yakınsayan ışınlar
    const coneLines = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const top = new BABYLON.Vector3(sphereR * 0.85 * Math.cos(a), sphereY - sphereR * 0.5, sphereR * 0.85 * Math.sin(a));
      const bottom = new BABYLON.Vector3(circleR * Math.cos(a), circleY, circleR * Math.sin(a));
      coneLines.push([top, bottom]);
    }
    const cone = BABYLON.MeshBuilder.CreateLineSystem("holoCone_" + x, { lines: coneLines }, this);
    cone.color = cyan; cone.parent = holoRoot; cone.applyFog = false;

    // Taban: eşmerkezli çemberler + ışınsal çizgiler (mukantara/azimut deseni)
    const baseLines = [];
    [circleR, circleR * 0.66, circleR * 0.33].forEach((r) => {
      const pts = [];
      for (let a = 0; a <= 360; a += 8) pts.push(new BABYLON.Vector3(r * Math.cos(BABYLON.Tools.ToRadians(a)), circleY, r * Math.sin(BABYLON.Tools.ToRadians(a))));
      baseLines.push(pts);
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      baseLines.push([
        new BABYLON.Vector3(0, circleY, 0),
        new BABYLON.Vector3(circleR * Math.cos(a), circleY, circleR * Math.sin(a)),
      ]);
    }
    const baseGrid = BABYLON.MeshBuilder.CreateLineSystem("holoBase_" + x, { lines: baseLines }, this);
    baseGrid.color = cyan; baseGrid.parent = holoRoot; baseGrid.applyFog = false;

    // Yavaş dönüş
    this.registerBeforeRender(() => {
      holoRoot.rotation.y += 0.0018;
    });

    return holoRoot;
  }

  // Duvara gömülü, tıklanınca dijital aracı SAYFA İÇİNDE (iframe katmanı, yeni
  // sekmede değil) açan ekran paneli. Devre kartı deseni burada, doğrudan
  // ekranın kendi dokusunda — 3D duvar yüzeyinde değil, o yüzden hareket etmiyor.
  createWallScreen(x, z, title, actionLabel, url) {
    const w = 1.6, h = 1.0;
    const dt = new BABYLON.DynamicTexture("screenTex_" + x, { width: 512, height: 320 }, this);
    const ctx = dt.getContext();
    ctx.fillStyle = "#04090b";
    ctx.fillRect(0, 0, 512, 320);
    // devre deseni — sadece bu ekranın içinde, sabit, hareket etmiyor
    ctx.strokeStyle = "#123842";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      let px = Math.random() * 512, py = Math.random() * 320;
      ctx.beginPath();
      ctx.moveTo(px, py);
      const segs = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segs; s++) {
        if (Math.random() < 0.5) px += (Math.random() < 0.5 ? 1 : -1) * (15 + Math.random() * 40);
        else py += (Math.random() < 0.5 ? 1 : -1) * (15 + Math.random() * 40);
        px = Math.max(4, Math.min(508, px));
        py = Math.max(4, Math.min(316, py));
        ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = url ? "#8fe9f5" : "#333333";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 492, 300);
    ctx.fillStyle = url ? "#eafcff" : "#777777";
    ctx.font = "bold 52px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(title, 256, 160);
    ctx.font = "bold 32px Georgia";
    ctx.fillStyle = url ? "#6fd7ea" : "#555555";
    ctx.fillText(actionLabel, 256, 215);
    dt.update();

    const mat = new BABYLON.StandardMaterial("screenMat_" + x, this);
    mat.diffuseTexture = dt;
    mat.emissiveTexture = dt;
    mat.emissiveColor = new BABYLON.Color3(url ? 0.8 : 0.15, url ? 0.85 : 0.15, url ? 0.9 : 0.15);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.backFaceCulling = false;

    const screen = BABYLON.MeshBuilder.CreatePlane("wallScreen_" + x, {
      width: w, height: h, sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, this);
    screen.position = new BABYLON.Vector3(x, 1.9, z);
    screen.rotation.y = Math.PI; // duvara bakan yüzden doğru (ters olmayan) okunması için
    screen.material = mat;
    screen.isPickable = !!url;

    if (url) {
      screen.actionManager = new BABYLON.ActionManager(this);
      screen.actionManager.hoverCursor = "pointer";
      screen.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
          screen.scaling = new BABYLON.Vector3(1.06, 1.06, 1.06);
        }),
      );
      screen.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
          screen.scaling = new BABYLON.Vector3(1, 1, 1);
        }),
      );
      screen.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
          // Yeni sekme YOK — aynı sayfa üzerinde gömülü katman olarak açılır (bkz. index.html)
          if (window.openEmbeddedTool) window.openEmbeddedTool(url, title);
        }),
      );
    }
    return screen;
  }

  // İki duvar arasında dar bir geçiş koridoru oluşturur
  createCorridor(centerX, frontZ, backZ, width) {
    const len = frontZ - backZ;
    const midZ = (frontZ + backZ) / 2;
    const left = BABYLON.MeshBuilder.CreateBox("corrLeft", { width: 0.2, height: this.wallH, depth: len }, this);
    left.position = new BABYLON.Vector3(centerX - width / 2, this.wallH / 2, midZ);
    left.material = this.wallMat;
    const right = BABYLON.MeshBuilder.CreateBox("corrRight", { width: 0.2, height: this.wallH, depth: len }, this);
    right.position = new BABYLON.Vector3(centerX + width / 2, this.wallH / 2, midZ);
    right.material = this.wallMat;
    [left, right].forEach(w => { w.checkCollisions = true; w.isPickable = false; });
  }

  // Sol/sağ duvarlı, arka duvarında (merkeze göre kaydırılabilir) kapı boşluğu olan bir salon oluşturur
  createRoomWithDoorway({ centerX, frontZ, backZ, width, doorwayX, doorwayWidth, doorwayHeight }) {
    const depth = frontZ - backZ;
    const midZ = (frontZ + backZ) / 2;
    const left = BABYLON.MeshBuilder.CreateBox("roomLeft", { width: 0.2, height: this.wallH, depth }, this);
    left.position = new BABYLON.Vector3(centerX - width / 2, this.wallH / 2, midZ);
    left.material = this.wallMat;
    const right = BABYLON.MeshBuilder.CreateBox("roomRight", { width: 0.2, height: this.wallH, depth }, this);
    right.position = new BABYLON.Vector3(centerX + width / 2, this.wallH / 2, midZ);
    right.material = this.wallMat;

    // arka duvar: doorwayX'te kapı boşluğu bırakan iki parça + kapı üstü lento
    const wallMinX = centerX - width / 2, wallMaxX = centerX + width / 2;
    const gapMinX = doorwayX - doorwayWidth / 2, gapMaxX = doorwayX + doorwayWidth / 2;
    const leftPieceW = gapMinX - wallMinX;
    const rightPieceW = wallMaxX - gapMaxX;
    const backL = BABYLON.MeshBuilder.CreateBox("roomBackL", { width: leftPieceW, height: this.wallH, depth: 0.2 }, this);
    backL.position = new BABYLON.Vector3(wallMinX + leftPieceW / 2, this.wallH / 2, backZ);
    backL.material = this.wallMat;
    const backR = BABYLON.MeshBuilder.CreateBox("roomBackR", { width: rightPieceW, height: this.wallH, depth: 0.2 }, this);
    backR.position = new BABYLON.Vector3(gapMaxX + rightPieceW / 2, this.wallH / 2, backZ);
    backR.material = this.wallMat;
    const lintelH = this.wallH - doorwayHeight;
    const lintel = BABYLON.MeshBuilder.CreateBox("roomLintel", { width: doorwayWidth, height: lintelH, depth: 0.2 }, this);
    lintel.position = new BABYLON.Vector3(doorwayX, doorwayHeight + lintelH / 2, backZ);
    lintel.material = this.wallMat;

    [left, right, backL, backR, lintel].forEach(w => { w.checkCollisions = true; w.isPickable = false; });
  }

  async init() {
    const response = await fetch("salon.json");
    const data = await response.json();
    this.importData(data);
    // Kütüphanenin varsayılan parlak yeşil/pembe "Exhibit/Display" işaretçilerini
    // gizle — kullanıcı bunları görmek istemiyor, gömülü ekranlar zaten yeterli.
    for (const id in this.stands) {
      const st = this.stands[id];
      if (st.standSign) st.standSign.isVisible = false;
      if (st.standSignText) st.standSignText.isVisible = false;
    }
  }
}
