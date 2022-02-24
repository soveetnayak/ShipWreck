import './style.css'


import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controls, water, sun;

let gameOver = false;

let thirdperson = true;

var _score = 0, _treasure = 0, _health = 100, _time = 0;

var treasures = []
const treasures_count = 5;

var enemies = []
const enemies_count = 5;

var playerbullets = []

var enemybullets = []

let canFire = true
var tempTime = 0;

function display() {
  document.getElementById("score").innerHTML = "Total Score: " + _score;
  document.getElementById("treasure").innerHTML = "Treasure Chest Collected: " + _treasure;
  document.getElementById("health").innerHTML = "Remaining Health: " + _health;
  document.getElementById("time").innerHTML = "Time Elasped: " + Math.floor(_time);

  // convert time to int and display

}
const loader = new GLTFLoader();

function randomnumber(min, max) {
  return Math.random() * (max - min) + min;
}

class Ship {

  constructor() {
    loader.load('assets/Player/scene.gltf', (gltf) => {
      scene.add(gltf.scene)

      gltf.scene.position.set(0, 0, 0)
      gltf.scene.scale.set(1, 1, 1)
      gltf.scene.rotation.y = 0;
      this.ship = gltf.scene
      this.motion = {
        speed: 0,
        rotate: 0
      }
    })
  }

  stop() {
    this.motion.speed = 0;
    this.motion.rotate = 0;
  }

  update() {
    if (this.ship) {
      this.ship.rotation.y += this.motion.rotate;
      this.ship.translateZ(this.motion.speed);
    }
  }
}

const ship = new Ship()

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene)
    })
  })
}

//spawn treasure relative to the ship
class Treasure {
  constructor(_scene) {
    let shipX = 0
    if (ship.ship) {
      shipX = ship.ship.position.x
    }
    _scene.position.set(shipX + randomnumber(-200, 200), 0, randomnumber(0, 300) + 100)
    _scene.scale.set(0.03, 0.03, 0.03)
    scene.add(_scene)
    //add a remove boolean to the treasure
    this.remove = false;
    this.treasure = _scene
  }

}

let tmodel = null

async function spawntreasure() {
  if (!tmodel) {
    tmodel = await loadModel('assets/Treasure/scene.gltf')
  }
  return new Treasure(tmodel.clone())
}

class Enemy {
  constructor(_scene) {
    let shipX = 0
    if (ship.ship) {
      shipX = ship.ship.position.x
    }
    _scene.position.set(shipX + randomnumber(-200, 200), 5, 400 + randomnumber(0, 300))
    _scene.scale.set(0.015, 0.015, 0.015)
    scene.add(_scene)
    this.enemy = _scene

    //speed and rotation
    this.motion = {
      speed: -1,
      rotate: 0
    }
    this.remove = false;
    this.health = 100;

  }
  update() {
    if (this.enemy) {
      this.enemy.translateZ(this.motion.speed);
    }
  }
}

let emodel = null

async function spawnenemy() {
  if (!emodel) {
    emodel = await loadModel('assets/Enemy/scene.gltf')
  }
  return new Enemy(emodel.clone())
}

// let treasure = new Treasure()
// setTimeout(() => {
//   spawntreasure().then(treasure => {
//     console.log(treasure)
//   })
// }, 1000)

init();
animate();

async function init() {

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  //

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(0, 50, -100);

  //
  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add(water);

  // Skybox
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;

  }

  updateSun();

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();


  const waterUniforms = water.material.uniforms;

  //
  for (let i = 0; i < treasures_count; i++) {
    const treasure = await spawntreasure()
    treasures.push(treasure)
  }

  //
  for (let i = 0; i < enemies_count; i++) {
    const enemy = await spawnenemy()
    enemies.push(enemy)
  }

  window.addEventListener('resize', onWindowResize);

  //Update: Also make camera follow ship
  window.addEventListener('keydown', function (e) {
    if (e.key == "w") {
      ship.motion.speed = 1
    }
    if (e.key == "s") {
      ship.motion.speed = -1
    }
    if (e.key == "d") {
      ship.motion.rotate = -0.1
    }
    if (e.key == "a") {
      ship.motion.rotate = 0.1
    }
    // Bullet
    if (e.key == " ") {
      console.log("Fire")
      var bullet = new THREE.Mesh(
        new THREE.SphereGeometry(2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      )
      bullet.position.set(ship.ship.position.x, ship.ship.position.y + 5, ship.ship.position.z + 5)

      bullet.velocity = new THREE.Vector3(
        Math.sin(bullet.rotation.y) * 3,
        0,
        Math.cos(bullet.rotation.y) * 3
      )
      bullet.alive = true
      setTimeout(function () {
        bullet.alive = false
        scene.remove(bullet)
      }, 10000)

      //add it to the array
      playerbullets.push(bullet)

      scene.add(bullet)
    }
    if (e.key == "c") {
      thirdperson = !thirdperson
    }
  })

  window.addEventListener('keyup', function (e) {
    if (e.key == "w") {
      ship.motion.speed = 0
    }
    if (e.key == "s") {
      ship.motion.speed = 0
    }
    if (e.key == "d") {
      ship.motion.rotate = 0
    }
    if (e.key == "a") {
      ship.motion.rotate = 0
    }

  })

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (!gameOver) requestAnimationFrame(animate);
  render();

  if (_health <= 0) {
    gameOver = true
    document.getElementById("over").innerHTML = "Game Over"
    //button to reload page and play again
    // document.getElementById("reload").innerHTML = "Reload"
    // document.getElementById("reload").style.display = "block"
    // document.getElementById("reload").addEventListener("click", function(){
    //   location.reload()
    // }
    // )
  }
  ship.update();
  //update all enemy ships
  enemies.forEach(enemy => {
    enemy.update()
  })

  for (var index = 0; index < playerbullets.length; index++) {
    if (playerbullets[index] == undefined) continue;
    if (playerbullets[index].alive == false) {
      // scene.remove(bullets[index])
      playerbullets.splice(index, 1)
      continue
    }

    playerbullets[index].position.add(playerbullets[index].velocity)
  }
  //Enemy bullets every 3 seconds
  if (tempTime != Math.floor(_time) && enemies.length > 0) {
    tempTime = Math.floor(_time)
    var enemybullet = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    var enemyIndex = randomnumber(0, enemies_count - 1)
    enemyIndex = Math.floor(enemyIndex)
    // console.log(enemyIndex)
    // console.log(enemies[enemyIndex])
    if (enemies[enemyIndex] != undefined && enemies[enemyIndex].remove == false) {
      enemybullet.position.set(enemies[enemyIndex].enemy.position.x, enemies[enemyIndex].enemy.position.y + 5, enemies[enemyIndex].enemy.position.z + 5)
    }
    enemybullet.velocity = new THREE.Vector3(
      0,
      0,
      -3
    )

    enemybullet.alive = true
    setTimeout(function () {
      enemybullet.alive = false
      scene.remove(enemybullet)
    }, 10000)

    enemybullets.push(enemybullet)
    scene.add(enemybullet)
  }

  for (var index = 0; index < enemybullets.length; index++) {
    if (enemybullets[index] == undefined) continue;
    if (enemybullets[index].alive == false) {
      // scene.remove(bullets[index])
      enemybullets.splice(index, 1)
      continue
    }

    enemybullets[index].position.add(enemybullets[index].velocity)
  }

  //make camera follow ship
  // thirdperson && bird eye view
  if (thirdperson) {
    //wait for ship to load
    if (ship.ship != undefined) {
      camera.lookAt(ship.ship.position.x, ship.ship.position.y, ship.ship.position.z + 50)
      camera.position.z = ship.ship.position.z - 80;
      camera.position.y = ship.ship.position.y + 70;
      camera.position.x = ship.ship.position.x;
    }
  }
  else {
    //make the camera look at the ship but not turn with the ship
    //rotate the camera so it is aligned with the ship
    camera.rotation.y = Math.PI * 2;
    camera.rotation.x = Math.PI * -0.5;
    //Keep the ship at the center of the screen
    if (ship.ship != undefined) {
      camera.position.z = ship.ship.position.z;
      camera.position.y = ship.ship.position.y + 300;
      camera.position.x = ship.ship.position.x;
    }
  }

  // Update time
  _time = performance.now() * 0.001;

  _health = Math.max(0, _health);

  collecttreasure();
  shipcollison();
  bullethit();

  //If treasure's z position is greater than the camera's z position, remove it and spawn a new one
  treasures.forEach(treasure => {
    if (treasure.treasure) {
      if (treasure.treasure.position.z < camera.position.z - 150) {
        treasure.treasure.position.z += randomnumber(600, 1800);
        treasure.treasure.position.x = randomnumber(-200, 200) + ship.ship.position.x;
        //add it back to scene if removed
        if (treasure.treasure.remove) {
          scene.add(treasure.treasure);
          treasure.treasure.remove = false;
        }
      }
    }
  })
  //If enemy's z position is greater than the camera's z position, remove it and spawn a new one
  enemies.forEach(enemy => {
    if (enemy.enemy) {
      if (enemy.enemy.position.z < camera.position.z - 150) {
        enemy.enemy.position.z += randomnumber(600, 1800);
        enemy.enemy.position.x = randomnumber(-200, 200) + ship.ship.position.x;
        if (enemy.enemy.remove) {
          scene.add(enemy.enemy);
          enemy.enemy.remove = false;
        }
      }

    }
  })


  display();
}

function render() {
  const time = performance.now() * 0.001;

  water.material.uniforms['time'].value += 1.0 / 60.0;

  renderer.render(scene, camera);

}

function collisionTrue(a, b) {
  return (
    Math.abs(a.position.x - b.position.x) < 20 &&
    Math.abs(a.position.y - b.position.y) < 20 &&
    Math.abs(a.position.z - b.position.z) < 20
  )
}

function bullethit() {
  if (ship.ship) {
    for (var index = 0; index < enemybullets.length; index++) {
      // console.log(enemybullets[index])
      if (enemybullets[index] == undefined) continue;
      if (enemybullets[index].alive == false) continue;
      console.log(collisionTrue(ship.ship, enemybullets[index]))
      if (collisionTrue(ship.ship, enemybullets[index])) {
        console.log("hit")
        _health -= 10;
        enemybullets[index].alive = false;
        scene.remove(enemybullets[index])
        enemybullets.splice(index, 1)
      }
    }

    for (var index = 0; index < playerbullets.length; index++) {
      // console.log(enemybullets[index])
      if (playerbullets[index] == undefined) continue;
      if (playerbullets[index].alive == false) continue;

      for (var index2 = 0; index2 < enemies.length; index2++) {
        if (enemies[index2] == undefined) continue;
        if (enemies[index2].enemy.remove == true) continue;
        if (collisionTrue(playerbullets[index], enemies[index2].enemy)) {
          console.log("hit")

          playerbullets[index].alive = false;
          scene.remove(playerbullets[index])
          playerbullets.splice(index, 1)
          enemies[index2].enemy.remove = true;
          scene.remove(enemies[index2].enemy)

          _score += 20;
        }
      }
    }
  }
}

function collecttreasure() {
  if (ship.ship) {
    treasures.forEach(treasure => {
      if (treasure.treasure) {
        if (collisionTrue(ship.ship, treasure.treasure)) {
          // if treasure is removed already dont increase score, increase score only once
          //check if treasure is removed
          if (!treasure.remove) {
            treasure.remove = true;
            _score += 10
            _treasure += 1
          }
          scene.remove(treasure.treasure)
        }
      }
    })
  }
}

function shipcollison() {
  if (ship.ship) {
    enemies.forEach(enemy => {
      if (enemy.enemy) {
        if (collisionTrue(ship.ship, enemy.enemy)) {
          if (!enemy.remove) {
            _health -= 10;
            enemy.remove = true;
            scene.remove(enemy.enemy)
          }
        }
      }
    })
  }
}


function gameLost() {
  //Print game over in the middle of the screen
  var text = new THREE.Mesh(
    new THREE.TextGeometry("Game Over", {
      font: font,
      size: 80,
      height: 5,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 10,
      bevelSize: 8,
      bevelSegments: 5
    }),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  text.position.x = 0;
  text.position.y = 0;
  text.position.z = -100;
  scene.add(text);

  //Print score in the middle of the screen
  var text = new THREE.Mesh(
    new THREE.TextGeometry("Score: " + _score, {
      font: font,
      size: 80,
      height: 5,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 10,
      bevelSize: 8,
      bevelSegments: 5
    }),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  text.position.x = 0;
  text.position.y = -100;
  text.position.z = -100;
  scene.add(text);
}