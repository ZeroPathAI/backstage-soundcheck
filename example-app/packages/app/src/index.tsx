import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';

// App is a JSX element from app.createRoot(), not a component
ReactDOM.createRoot(document.getElementById('root')!).render(App);
