import App from './App';

test('exports App component', () => {
  expect(App).toBeDefined();
  expect(typeof App).toBe('function');
});
