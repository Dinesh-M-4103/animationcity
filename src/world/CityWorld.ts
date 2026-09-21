import * as THREE from 'three';
import { buildingLots, roadNetwork } from '../data/cityBlockData';
import { EnvironmentFactory } from './environment/EnvironmentFactory';
import { BuildingFactory } from './buildings/BuildingFactory';
import { ParkedVehicleFactory } from './vehicles/ParkedVehicleFactory';
import { RoadNetworkRenderer } from './roads/RoadNetworkRenderer';
import { TrafficSimulation } from '../simulation/TrafficSimulation';
import { PedestrianSimulation } from '../simulation/pedestrians/PedestrianSimulation';

export class CityWorld {
  readonly object = new THREE.Group();
  readonly trafficSimulation = new TrafficSimulation();
  readonly pedestrianSimulation: PedestrianSimulation;

  constructor() {
    this.object.name = 'CityWorld';

    const environmentFactory = new EnvironmentFactory();
    const roadRenderer = new RoadNetworkRenderer(roadNetwork);
    const buildingFactory = new BuildingFactory();
    const vehicleFactory = new ParkedVehicleFactory();

    this.object.add(environmentFactory.createGround());
    this.object.add(roadRenderer.createRoads());
    this.object.add(environmentFactory.createSidewalkPlazas());

    for (const lot of buildingLots) {
      this.object.add(buildingFactory.createBuilding(lot));
    }

    this.object.add(environmentFactory.createStreetLights());
    this.object.add(environmentFactory.createTrees());
    this.object.add(environmentFactory.createStreetProps());
    this.object.add(vehicleFactory.createParkedVehicles());

    // Pedestrian simulation setup & vehicle safety connection
    this.pedestrianSimulation = new PedestrianSimulation(this.trafficSimulation.trafficLights);
    this.trafficSimulation.vehicleManager.setPedestrianManager(this.pedestrianSimulation.manager);

    this.object.add(this.trafficSimulation.object);
    this.object.add(this.pedestrianSimulation.object);
  }

  update(deltaSeconds: number): void {
    this.trafficSimulation.update(deltaSeconds);
    this.pedestrianSimulation.update(deltaSeconds);
  }
}
