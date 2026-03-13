export function cloneInterpreterCommand(command) {
    const cloned = { ...command };
    if (Array.isArray(command.commands)) {
        cloned.commands = command.commands.map((nestedCommand) => cloneInterpreterCommand(nestedCommand));
    }
    if (Array.isArray(command.thenCommands)) {
        cloned.thenCommands = command.thenCommands.map((nestedCommand) => cloneInterpreterCommand(nestedCommand));
    }
    if (Array.isArray(command.elseCommands)) {
        cloned.elseCommands = command.elseCommands.map((nestedCommand) => cloneInterpreterCommand(nestedCommand));
    }
    delete cloned.remainingDistance;
    delete cloned.remainingAngle;
    delete cloned.animationProgress;
    delete cloned.startScale;
    delete cloned.remainingIterations;
    return cloned;
}
