// MUKANTARA — Sanal Salon prototipi
// Motor: Immersions (Babylon.js) — Apache 2.0, bkz. LICENSE / NOTICE
// Bu dosya sadece MİMARİ (oda, ışık, malzeme, kaide düzeni) tanımlıyor.
// Sergilenen objelerin kendisi (Halkalı Küre, usturlaplar) henüz CAD/foto­grametri
// verisi olmadığı için burada KUTU yer tutucu olarak duruyor — ileride
// gerçek 3D taramayla değiştirilecek (bkz. attachMesh / setExhibit).

class MukantaraSalon extends Immersion {
  constructor(engine) {
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
      doorwayWidth: 3, doorwayHeight: 2.6,
    });
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

  // Sol/sağ duvarlı, arka duvarında ortada kapı boşluğu olan bir salon oluşturur
  createRoomWithDoorway({ centerX, frontZ, backZ, width, doorwayWidth, doorwayHeight }) {
    const depth = frontZ - backZ;
    const midZ = (frontZ + backZ) / 2;
    const left = BABYLON.MeshBuilder.CreateBox("roomLeft", { width: 0.2, height: this.wallH, depth }, this);
    left.position = new BABYLON.Vector3(centerX - width / 2, this.wallH / 2, midZ);
    left.material = this.wallMat;
    const right = BABYLON.MeshBuilder.CreateBox("roomRight", { width: 0.2, height: this.wallH, depth }, this);
    right.position = new BABYLON.Vector3(centerX + width / 2, this.wallH / 2, midZ);
    right.material = this.wallMat;

    // arka duvar: ortada kapı boşluğu bırakan iki parça + kapı üstü lento
    const sidePieceW = (width - doorwayWidth) / 2;
    const backL = BABYLON.MeshBuilder.CreateBox("roomBackL", { width: sidePieceW, height: this.wallH, depth: 0.2 }, this);
    backL.position = new BABYLON.Vector3(centerX - doorwayWidth / 2 - sidePieceW / 2, this.wallH / 2, backZ);
    backL.material = this.wallMat;
    const backR = BABYLON.MeshBuilder.CreateBox("roomBackR", { width: sidePieceW, height: this.wallH, depth: 0.2 }, this);
    backR.position = new BABYLON.Vector3(centerX + doorwayWidth / 2 + sidePieceW / 2, this.wallH / 2, backZ);
    backR.material = this.wallMat;
    const lintelH = this.wallH - doorwayHeight;
    const lintel = BABYLON.MeshBuilder.CreateBox("roomLintel", { width: doorwayWidth, height: lintelH, depth: 0.2 }, this);
    lintel.position = new BABYLON.Vector3(centerX, doorwayHeight + lintelH / 2, backZ);
    lintel.material = this.wallMat;

    [left, right, backL, backR, lintel].forEach(w => { w.checkCollisions = true; w.isPickable = false; });
  }

  async init() {
    const response = await fetch("salon.json");
    const data = await response.json();
    this.importData(data);
  }
}
