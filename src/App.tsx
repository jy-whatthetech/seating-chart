import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SeatingChart from './components/SeatingChart';
import theme from './theme/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SeatingChart />
    </ThemeProvider>
  );
}

export default App;
