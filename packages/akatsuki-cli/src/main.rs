mod cli;
mod commands;
mod error;
mod utils;

use anyhow::Result;
use cli::Cli;
use clap::Parser;

fn main() -> Result<()> {
    let cli = Cli::parse();
    cli.run()
}
