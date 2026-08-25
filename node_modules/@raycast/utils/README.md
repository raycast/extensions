# Raycast Utilities

In addition to the [Raycast API](https://developers.raycast.com/api-reference/ai) which is bundled as part of the app, we also provide a sibling package that contains a set of utilities to streamline common patterns and operations used in extensions.

![image](https://user-images.githubusercontent.com/3254314/181186048-37bf34c2-a317-4181-8976-2122af6a8506.png)

## Installation

This package can be installed independently using `npm`.

```
npm install --save @raycast/utils
```

[`@raycast/utils`](https://www.npmjs.com/package/@raycast/utils) has a [peer dependency](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies) on [`@raycast/api`](https://www.npmjs.com/package/@raycast/api). This means that a certain version of `@raycast/utils` will require a version above a certain version of `@raycast/api`. `npm` will warn you if that is not the case.

## Documentation

Find the documentation on [developers.raycast.com](https://developers.raycast.com/utilities/getting-started).
