import { Canvas } from "@react-three/fiber";
import { useWorldStore } from "../../store/worldStore";
import { useFarmStore } from "../../store/farmStore";
import { useUiStore } from "../../store/uiStore";
import { useInteriorStore } from "../../store/interiorStore";
import { useCameraStore } from "../../store/cameraStore";
import { useCropStore } from "../../store/cropStore";
import { useEconomyStore } from "../../store/economyStore";
import { useVetStore } from "../../store/vetStore";
import { useUpgradesStore } from "../../store/upgradesStore";
import { createRenderer } from "../renderer/renderer";
import { CameraRig } from "../camera/CameraRig";
import { PostFX } from "../fx/PostFX";
import { Terrain } from "../../entities/terrain/Terrain";
import { Water } from "../../entities/terrain/Water";
import { Trees } from "../../entities/vegetation/Trees";
import { GrassField } from "../../entities/vegetation/GrassField";
import { Flowers } from "../../entities/vegetation/Flowers";
import { Rocks } from "../../entities/vegetation/Rocks";
import { Bushes } from "../../entities/vegetation/Bushes";
import { Buildings } from "../../entities/buildings/Buildings";
import { Animals } from "../../entities/animals/Animals";
import { CropField } from "../../entities/crops/CropField";
import { Decor } from "../../entities/props/Decor";
import { TimeSystem } from "../../systems/time/TimeSystem";
import { WeatherSystem, Rain } from "../../systems/weather/WeatherSystem";
import { EconomySystem } from "../../systems/economy/EconomySystem";
import { CropSystem } from "../../systems/economy/CropSystem";
import { VetSystem } from "../../systems/veterinary/VetSystem";
import { PhysicsWorld } from "../../systems/physics/PhysicsWorld";
import { InteriorCamera } from "../interiors/InteriorCamera";
import { InteriorGroup } from "../interiors/InteriorGroup";

export function Experience() {
  const booted = useWorldStore((s) => s.booted);

  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onClick={() => useUiStore.getState().closeSection()}
    >
      <Canvas
      shadows
      dpr={[1, 2]}
      gl={createRenderer as unknown as React.ComponentProps<typeof Canvas>["gl"]}
      camera={{ fov: 50, near: 0.5, far: 1600, position: [110, 95, -125] }}
      onCreated={(state) => {
        useWorldStore.getState().setBooted(true);
        (window as unknown as Record<string, unknown>).__IFS__ = {
          renderer: state.gl,
          scene: state.scene,
          camera: state.camera,
          ui: useUiStore,
          world: useWorldStore,
          interior: useInteriorStore,
          cameraCtl: useCameraStore,
          farm: useFarmStore,
          crops: useCropStore,
          economy: useEconomyStore,
          vet: useVetStore,
          upgrades: useUpgradesStore,
        };
      }}
    >
      <color attach="background" args={["#a9cfe6"]} />
      <TimeSystem />
      <CameraRig />
      <InteriorCamera />
      <InteriorGroup />
      <Terrain />
      <Water />
      <GrassField />
      <Trees />
      <Bushes />
      <Flowers />
      <Rocks />
      <CropField />
      <Buildings />
      <Decor />
      <Animals />
      <WeatherSystem />
      <Rain />
      <EconomySystem />
      <CropSystem />
      <VetSystem />
      <PhysicsWorld />
      {booted && <PostFX />}
      </Canvas>
    </div>
  );
}
