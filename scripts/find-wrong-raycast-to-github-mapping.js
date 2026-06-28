#!/usr/bin/env node

const path = require("path");
const mapping = require("../.github/raycast2github.json");

const duplicated = {};
Object.entries(mapping).forEach(([raycast, github]) => {
  if (duplicated[github]) {
    duplicated[github].push(raycast);
  } else {
    duplicated[github] = [raycast];
  }
});

Object.entries(duplicated).forEach(([github, raycasts]) => {
  if (raycasts.length > 1) {
    console.log(`${github} is duplicated in ${raycasts.join(", ")}`);
  }
});
