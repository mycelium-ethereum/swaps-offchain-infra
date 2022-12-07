# Swaps Offchain Infrastructure

Monorepo for offchain infrastructure services.

The repository leverages [Nrwl's Nx](https://nx.dev/getting-started/intro) monorepo management tools. This makes it very easy to link shared libraries to multiple apps while maintaining seperation and CI speeds with only running tasks affected by change and computation caching.

Nx has a lot of [code generators](https://nx.dev/getting-started/intro) to make it easier to maintain and enforce consistency across the monorepo.
These generators automatically generate some useful targets (such as build and test), setup file structures, and link base tsconfig and eslint configuration files to the root of the monorepo.

To make it easier to remember there are two yarn scripts which can be used to generate `node apps` and `js libs`. This can be extended in the future to include `ui` and `ui component library` generators. These sripts are `generate:lib` and `generate:node` and take 1 argument being the name of the library you are generating.
eg. `generate:lib example-lib`. This will automatically prepend `@mycelium-ethereum/` to `example-lib` so then you can import the library as `import ExampleLib from '@mycelium-ethereum/example-lib'`

Since a lot of Nx runs on generators and file tsconfig links, they provide a lot of useful tooling for things such as renaming or moving variables (since this might have unknown side effects to the developer). An example of this can be found with [@nrwl/workspace:move](https://nx.dev/packages/workspace/generators/move) which provides an easy plugin to move a package from one place to another. Be sure to read the generators documentation before making any structural chages to the repository.

## Getting started

Install dependencies (yarn preffered)
`npm install` or `yarn`
This will install all dependencies required by all packages. During the build stage packages generate their own package.json if `generatePackageJson` is set to true in the [webpack configuration](https://nx.dev/packages/webpack/executors/webpack#generatepackagejson). This is optimised such that the distributed package does not have unused libraries included in the package.json.

## Running packages

[Task running](https://nx.dev/core-features/run-tasks#run-tasks) in Nx can be done on an individual or many scale. For example to running
`npx nx run build swaps-js` will only build the `swaps-js` package and all its dependencies (building `swaps-prices` will also build `swaps-js` as its a dependency). To run commands across many packages use [nx run-many](https://nx.dev/core-features/run-tasks#run-everything) eg. `npx nx run-many --target=build`. Where `--target` can be replaced with any command. Nx will go through each of the packages run the target script on any of the packages which include it in its `project.json` configuration.

# Packages

## [@mycelium-ethereum/swaps-js](packages/swaps-js)

A simple js package that contains reused types, utils and constants

## [@mycelium-ethereum/swaps-keepers](packages/swaps-keepers)

Swaps position and price keepers

To run this in development mode run
`yarn dev:prices`

## [@mycelium-ethereum/swaps-prices](packages/swaps-prices)

A seperate pricing service which uses the same websockets as the priceKeepers, serves these prices over a websocket and http server.

To run this in development mode run
`yarn dev:prices`
