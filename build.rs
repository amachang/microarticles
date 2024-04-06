use std::{path::Path, process::Command};
use anyhow::Result;

fn main() -> Result<()> {
    println!("cargo:rerun-if-changed=frontend/src");
    println!("cargo:rerun-if-changed=frontend/package.json");
    println!("cargo:rerun-if-changed=frontend/index.html");
    println!("cargo:rerun-if-changed=frontend/public");

    // if not installed yet, install npm dependencies
    // check the node_modules folder
    if !Path::new("frontend/node_modules").exists() {
        Command::new("npm").args(&["install", "--prefix", "frontend"]).status()?;
    }
    assert!(Path::new("frontend/node_modules").exists());

    Command::new("npm").args(&["run", "build", "--prefix", "frontend"]).status()?;

    Ok(())
}

