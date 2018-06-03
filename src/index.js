import React from 'react'
import { StyleSheet, Text, View, PanResponder } from 'react-native'
import { GLView, Asset, FileSystem } from 'expo'
import '@expo/browser-polyfill'

const THREE = require('three')
global.THREE = THREE
require('../lib/ObjLoader')
require('../lib/MTLLoader')
import ExpoTHREE from 'expo-three'

console.disableYellowBox = true

export default class App extends React.Component {
  state = {
    loaded: false,
  }

  componentWillMount = () => {
    this.preloadAssetsAsync()
    this.panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        // The gesture has started. Show visual feedback so the user knows
        // what is happening!
        // gestureState.d{x,y} will be set to zero now
      },
      onPanResponderMove: (evt, gestureState) => {
        // The most recent move distance is gestureState.move{X,Y}
        // The accumulated gesture distance since becoming responder is
        // gestureState.d{x,y}
        if (gestureState.numberActiveTouches === 1) {
          this.aircraft.rotation.y += gestureState.dx * 0.001
        }
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        // Returns whether this component should block native components from becoming the JS
        // responder. Returns true by default. Is currently only supported on android.
        return true
      },
    })
  }

  preloadAssetsAsync = async () => {
    await Promise.all(
      [
        require('./assets/textures/E-45_col.jpg'),
        require('./assets/textures/E-45-nor_1.jpg'),
        require('./assets/textures/E-45_glass_nor_.jpg'),
        require('./assets/aircraft.obj'),
        require('./assets/aircraft.mtl'),
        require('./assets/textures/E-45-nor_1.jpg'),
      ].map(module => Asset.fromModule(module).downloadAsync()),
    )
    this.setState({ loaded: true })
  }

  handleContextCreate = async gl => {
    const arSession = await this.glView.startARSessionAsync()

    const scene = new THREE.Scene()
    const camera = ExpoTHREE.createARCamera(
      arSession,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      0.01,
      1000,
    )

    const renderer = ExpoTHREE.createRenderer({ gl })
    scene.background = ExpoTHREE.createARBackgroundTexture(arSession, renderer)
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight)

    // lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(0.4, 1, 0)
    scene.add(dirLight)
    const ambLight = new THREE.AmbientLight(0x606060)
    scene.add(ambLight)

    // aircraft model
    const mtlLoader = new THREE.MTLLoader()
    const aircraftMTLAsset = Asset.fromModule(require('./assets/aircraft.mtl'))
    await aircraftMTLAsset.downloadAsync()
    const mtlMaterials = mtlLoader.parse(
      await FileSystem.readAsStringAsync(aircraftMTLAsset.localUri),
    )

    mtlMaterials.preload()

    const aircraftAsset = Asset.fromModule(require('./assets/aircraft.obj'))
    await aircraftAsset.downloadAsync()
    const aircraftLoader = new THREE.OBJLoader()
    aircraftLoader.setMaterials(mtlMaterials)
    this.aircraft = aircraftLoader.parse(
      await FileSystem.readAsStringAsync(aircraftAsset.localUri),
    )
    this.aircraft.position.z = -10
    this.aircraft.position.y = -3
    this.aircraft.rotation.y = 90
    scene.add(this.aircraft)

    const animate = () => {
      requestAnimationFrame(animate)
      // this.aircraft.rotation.y += 0.03
      renderer.render(scene, camera)
      gl.endFrameEXP()
    }
    animate()
  }

  render() {
    const { loaded } = this.state
    return (
      loaded && (
        <GLView
          {...this.panResponder.panHandlers}
          ref={ref => (this.glView = ref)}
          onContextCreate={this.handleContextCreate}
          style={{ flex: 1 }}
        />
      )
    )
  }
}
