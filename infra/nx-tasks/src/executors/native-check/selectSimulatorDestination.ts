/**
 * Selects an existing available iPhone simulator without creating a device.
 *
 * @remarks A booted simulator is preferred so local verification reuses the
 * existing runtime. CI can select an installed, unbooted device for xcodebuild.
 *
 * @param inventory - Unknown JSON returned by simctl's available-device inventory.
 * @returns A concrete Xcode simulator destination containing its existing UDID.
 * @throws An error when the inventory is malformed or no usable device exists.
 *
 * @public
 */
export function selectSimulatorDestination(inventory: unknown): string {
    if (!isRecord(inventory) || !isRecord(inventory.devices))
        throw new Error('The installed simulator inventory is invalid.');
    const devices = Object.entries(inventory.devices)
        .filter(([runtime]) => runtime.includes('.iOS-'))
        .flatMap(([, value]) => (Array.isArray(value) ? value : []))
        .filter(
            (value): value is Record<string, unknown> =>
                isRecord(value) &&
                typeof value.name === 'string' &&
                value.name.startsWith('iPhone') &&
                typeof value.udid === 'string' &&
                /^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/.test(
                    value.udid,
                ) &&
                value.isAvailable !== false,
        );
    const selected = devices.find((device) => device.state === 'Booted') ?? devices[0];
    if (!selected) throw new Error('No existing available iPhone simulator is installed.');
    return `platform=iOS Simulator,id=${String(selected.udid)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
