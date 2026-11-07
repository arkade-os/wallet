package io.arkade.satochip;

import java.util.Objects;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

final class ReaderModeLease<T> {
    private Object owner;
    private T lastTag;

    synchronized void claim(Object request) {
        owner = Objects.requireNonNull(request);
    }

    synchronized Object owner() { return owner; }

    synchronized boolean runIfOwned(Object request, BooleanSupplier current, Runnable action) {
        if (request == null || owner != request || !current.getAsBoolean()) return false;
        action.run();
        return true;
    }

    synchronized boolean recordTag(Object request, T tag) {
        if (request == null || owner != request) return false;
        lastTag = tag;
        return true;
    }

    synchronized boolean release(Object request, BooleanSupplier idle, Consumer<T> action) {
        if (request == null || owner != request || !idle.getAsBoolean()) return false;
        T tag = lastTag;
        owner = null;
        lastTag = null;
        action.accept(tag);
        return true;
    }
}
