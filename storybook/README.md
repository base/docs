### Install Dependencies

```bash
# Install dependencies
npm install
```

```bash
# Update dependencies
npm update
```

### Build Project

```bash
# Build the project
npm run build
```

### Run Storybook

```bash
# Start Storybook
npm run storybook
```

### URL format for iframes

```
https://<appid>-<uploadhash>.chromatic.com/iframe.html?args=&id={path-to-story}&viewMode=story&dark=true&hero=true
```

examples:

```jsx
<iframe
  src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-identity-identity--default-identity&viewMode=story&dark=true&hero=true"
  width="100%"
  height="auto"
/>
```

[Chromatic Docs](https://www.chromatic.com/docs/embed/)
