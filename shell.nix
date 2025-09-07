{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20  # Or whichever Node.js version you're using
    nodePackages.pnpm
    
  ];

}
