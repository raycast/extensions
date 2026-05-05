# Add Swift build artifacts to .gitignore
Add-Content -Path ".gitignore" -Value "`n.raycast-swift-build`n.swiftpm`ncompiled_raycast_swift"

# Update node types
npm install --save-dev @types/node@18.8.4 @types/react@18.2.27 react@18.2.0 --force
