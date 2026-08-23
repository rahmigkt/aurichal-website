// MUKANTARA — Sanal Salon prototipi
// Motor: Immersions (Babylon.js) — Apache 2.0, bkz. LICENSE / NOTICE
// Bu dosya sadece MİMARİ (oda, ışık, malzeme, kaide düzeni) tanımlıyor.
// Sergilenen objelerin kendisi (Halkalı Küre, usturlaplar) henüz CAD/foto­grametri
// verisi olmadığı için burada KUTU yer tutucu olarak duruyor — ileride
// gerçek 3D taramayla değiştirilecek (bkz. attachMesh / setExhibit).

class MukantaraSalon extends Immersion {
  constructor(engine) {
    console.log("MUKANTARA SALON — build v3 (hologram + duvar ekranları)");
    const config = {
      viewHeight: 1.75,
      skyboxSize: 300,
      // MUKANTARA marka paleti: --wall koyu yeşil-siyah tonu
      skyColor: new BABYLON.Color3(0.035, 0.05, 0.04),
      fogDensity: 0.018,
      fogColor: new BABYLON.Color3(0.035, 0.05, 0.04),
      groundSize: 40,
    };
    super("mukantaraSalon", "dark", engine, config);

    // -- Zemin rengini de aynı koyu tona çek --
    this.ground.material.diffuseColor = new BABYLON.Color3(0.03, 0.035, 0.03);
    this.ground.material.specularColor = new BABYLON.Color3(0, 0, 0);

    // -- Kaide malzemesini pirinç/altın rengine çeviriyoruz --
    // ("dark" stil kullanan tüm plinth/display bu malzemeyi paylaşır)
    this.darkPlinthMaterial.diffuseColor = new BABYLON.Color3(0.663, 0.475, 0.235); // brass
    this.darkPlinthMaterial.specularColor = new BABYLON.Color3(0.78, 0.6, 0.36);
    this.darkPlinthMaterial.specularPower = 64;
    this.darkPlinthMaterial.ambientColor = new BABYLON.Color3(0.2, 0.14, 0.07);

    // -- Işıklar: loş genel aydınlatma + kaidelere sıcak spot --
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this);
    hemi.intensity = 0.28;
    hemi.diffuse = new BABYLON.Color3(0.85, 0.8, 0.65);
    hemi.groundColor = new BABYLON.Color3(0.02, 0.02, 0.02);

    this.shadowLight = new BABYLON.DirectionalLight("shadowLight", new BABYLON.Vector3(-0.3, -1, 0.2), this);
    this.shadowLight.intensity = 0.5;
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
      spot.intensity = 25;
    });

    // -- Galeri mimarisi: giriş koridoru + ilk salon + gelecekteki salonlara açık kapı --
    // Çok-odalı galerinin ilk parçası. Yeni salonlar eklendikçe bu fonksiyonlarla
    // (createCorridor / createRoomWithDoorway) genişletilecek — tek dosyadan yönetilebilir.
    this.wallMat = new BABYLON.StandardMaterial("wallMat", this);
    this.wallMat.diffuseColor = new BABYLON.Color3(0.05, 0.065, 0.055);
    this.wallMat.specularColor = new BABYLON.Color3(0, 0, 0);
    this.wallH = 4.2;

    // Giriş koridoru: dar, salon öncesi geçiş hissi (z: 15 → 6)
    this.createCorridor(0, 15, 6, 4);

    // Ana salon: 14x12, arka duvarın ortasında 3m'lik kapı boşluğu bırakılıyor
    // (gelecekteki 2. salona geçiş için — henüz o taraf boş/karanlık)
    this.createRoomWithDoorway({
      centerX: 0, frontZ: 6, backZ: -6, width: 14,
      doorwayX: 5, doorwayWidth: 2.4, doorwayHeight: 2.6,
    });

    // -- Duvar ekranları: her kaidenin arkasında, tıklanınca ilgili dijital aracı
    // yeni sekmede açan panel. Henüz aracı olmayanlar (ör. Halkalı Küre) sadece
    // "Yakında" yazan, tıklanamaz bir panel olarak duruyor.
    this.createWallScreen(-3, -5.85, "Halkalı Küre", "Yakında", null);
    this.createWallScreen(0, -5.85, "Zerkâliyye", "İncele →", "https://mukantara.com/deneyimler/tusi-cifti/");
    this.createWallScreen(3, -5.85, "Zerkâliyye", "İncele →", "https://mukantara.com/deneyimler/tusi-cifti/");

    // -- Hologram prototipi: Azimut Küre-Koni --
    // Suudi Arabistan kürasyonu için üretilen AI konsept görsellerinin ilhamıyla,
    // burada VİDEO değil GERÇEK, döndürülebilir 3D geometri olarak kuruldu.
    // Halkalı Küre kaidesinin üstünde, henüz dijital aracı olmayan objenin
    // "hologram companion"ı olarak duruyor — GlowLayer ile ışıldama efekti.
    this.glow = new BABYLON.GlowLayer("glow", this, { mainTextureSamples: 2 });
    this.glow.intensity = 0.9;
    this.createAzimuthHologram(-3, -3.5, 1.35);
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

  // Duvara gömülü, tıklanınca dijital aracı yeni sekmede açan ekran paneli.
  // url == null ise ekran sadece bilgi amaçlı durur, tıklanamaz.
  createWallScreen(x, z, title, actionLabel, url) {
    const w = 1.6, h = 1.0;
    const dt = new BABYLON.DynamicTexture("screenTex_" + x, { width: 512, height: 320 }, this);
    const ctx = dt.getContext();
    ctx.fillStyle = "#0a0d0a";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = url ? "#a97b3c" : "#3a3a3a";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 308);
    ctx.fillStyle = url ? "#e8d9b8" : "#777777";
    ctx.font = "bold 40px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(title, 256, 150);
    ctx.font = "28px Georgia";
    ctx.fillStyle = url ? "#a97b3c" : "#555555";
    ctx.fillText(actionLabel, 256, 210);
    dt.update();

    const mat = new BABYLON.StandardMaterial("screenMat_" + x, this);
    mat.diffuseTexture = dt;
    mat.emissiveTexture = dt;
    mat.emissiveColor = new BABYLON.Color3(url ? 0.5 : 0.15, url ? 0.5 : 0.15, url ? 0.5 : 0.15);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.backFaceCulling = false;

    const screen = BABYLON.MeshBuilder.CreatePlane("wallScreen_" + x, {
      width: w, height: h, sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, this);
    screen.position = new BABYLON.Vector3(x, 1.9, z);
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
          this.openLink(url, title, true); // true = yeni sekmede aç, salon açık kalır
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
  }
}
