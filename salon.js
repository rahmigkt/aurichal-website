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

    // -- Oda geometrisi: sade dört duvar (kaide/oda serbest tasarım) --
    const wallMat = new BABYLON.StandardMaterial("wallMat", this);
    wallMat.diffuseColor = new BABYLON.Color3(0.05, 0.065, 0.055);
    wallMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const roomW = 14, roomD = 12, roomH = 4.2;
    const back = BABYLON.MeshBuilder.CreateBox("wallBack", { width: roomW, height: roomH, depth: 0.2 }, this);
    back.position = new BABYLON.Vector3(0, roomH / 2, -roomD / 2);
    back.material = wallMat;
    const left = BABYLON.MeshBuilder.CreateBox("wallLeft", { width: 0.2, height: roomH, depth: roomD }, this);
    left.position = new BABYLON.Vector3(-roomW / 2, roomH / 2, 0);
    left.material = wallMat;
    const right = BABYLON.MeshBuilder.CreateBox("wallRight", { width: 0.2, height: roomH, depth: roomD }, this);
    right.position = new BABYLON.Vector3(roomW / 2, roomH / 2, 0);
    right.material = wallMat;
    [back, left, right].forEach(w => { w.checkCollisions = true; w.isPickable = false; this.shadowGenerator.addShadowCaster ? null : null; });
  }

  async init() {
    const response = await fetch("salon.json");
    const data = await response.json();
    this.importData(data);
  }
}
