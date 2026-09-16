import type { PedestrianSignalState } from '../../types/Pedestrian';
import type { TrafficLightController } from '../traffic/TrafficLightController';

export class PedestrianSignalController {
  constructor(private readonly trafficLights: TrafficLightController) {}

  getSignalState(crosswalkId: string): PedestrianSignalState {
    const phase = this.trafficLights.getPhase();

    // crosswalk-north and crosswalk-south cross Harbor Street (North-South axis)
    // Pedestrians can cross when Harbor Street vehicular traffic is STOPPED (i.e. during EW_GREEN)
    if (crosswalkId === 'crosswalk-north' || crosswalkId === 'crosswalk-south') {
      return phase === 'EW_GREEN' ? 'WALK' : 'DONT_WALK';
    }

    // crosswalk-west and crosswalk-east cross Market Avenue (East-West axis)
    // Pedestrians can cross when Market Avenue vehicular traffic is STOPPED (i.e. during NS_GREEN)
    if (crosswalkId === 'crosswalk-west' || crosswalkId === 'crosswalk-east') {
      return phase === 'NS_GREEN' ? 'WALK' : 'DONT_WALK';
    }

    return 'DONT_WALK';
  }

  isWalkPermitted(crosswalkId: string): boolean {
    return this.getSignalState(crosswalkId) === 'WALK';
  }
}
