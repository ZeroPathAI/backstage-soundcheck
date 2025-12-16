import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';

// Custom styles for catalog table
const style = document.createElement('style');
style.textContent = `
  /* Make catalog Name column slightly wider */
  table th:first-child,
  table td:first-child {
    min-width: 220px;
  }
`;
document.head.appendChild(style);

// App is a JSX element from app.createRoot(), not a component
ReactDOM.createRoot(document.getElementById('root')!).render(App);
