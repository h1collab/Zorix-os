# Experimental Linux phone OS for x86_64 virtual machines

This is an **experimental postmarketOS build configuration**, not yet a tested, compiled OS. It targets a virtual x86_64 UEFI machine and uses the Phosh mobile interface. It is **not Android**, and it is not a ZorixOS release.

The workflow is in `.github/workflows/build-postmarketos-vm.yml`. It assembles upstream postmarketOS packages into a disk image; it does not rebuild the entire distribution from scratch.

## Build in GitHub Actions

1. Open the pull request and review the experimental workflow.
2. Once merged, open **Actions** > **Build postmarketOS mobile VM image** > **Run workflow**.
3. Check the build logs. If it succeeds, download the artifact ZIP, containing `postmarketos-v26.06-phosh-x86_64.img.xz` and `SHA256SUMS`.
4. Verify and decompress the image.

## QEMU on Ubuntu / Debian

Install QEMU with UEFI support:

```sh
sudo apt-get update
sudo apt-get install qemu-system-x86 ovmf xz-utils
```

After extracting the workflow artifact:

```sh
sha256sum -c SHA256SUMS
unxz postmarketos-v26.06-phosh-x86_64.img.xz
cp /usr/share/OVMF/OVMF_VARS_4M.fd ./OVMF_VARS.fd
qemu-system-x86_64 \
  -machine q35 -m 4096 -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE_4M.fd \
  -drive if=pflash,format=raw,file=./OVMF_VARS.fd \
  -drive file=postmarketos-v26.06-phosh-x86_64.img,format=raw,if=virtio \
  -device virtio-vga -display gtk \
  -netdev user,id=net0 -device virtio-net-pci,netdev=net0 \
  -device usb-tablet
```

Optional: add `-enable-kvm` **only** on a compatible Linux host with KVM enabled.

**Experimental VM credentials:** username `user`, password `147147`. Change the password if allowing network access. Never use these static credentials on an Internet-accessible real device.

## Limitations

- **Not yet verified:** the upstream postmarketOS branch, target name, pmbootstrap config options and the exact export filename must be verified by running the GitHub Actions workflow.
- GitHub's default hosted runner may run out of disk space. If so, use a larger/self-hosted runner or a prebuilt upstream image.
- A successful artifact upload does not prove graphical boot; check boot behavior with QEMU.
- This is a Linux mobile UI, not an Android APK-compatible system.
- Use a disposable VM with no sensitive accounts or shared folders. No physical phone flashing support is included.
