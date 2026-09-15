import './styles.css';
import { CitySimulationApp } from './app/CitySimulationApp';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root element was not found.');
}

const app = new CitySimulationApp(root);
app.start();
