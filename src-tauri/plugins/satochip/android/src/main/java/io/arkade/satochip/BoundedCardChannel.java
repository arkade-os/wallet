package io.arkade.satochip;

import java.io.IOException;
import org.satochip.io.APDUCommand;
import org.satochip.io.APDUResponse;
import org.satochip.io.CardChannel;

final class BoundedCardChannel implements CardChannel, AutoCloseable {
    private final CardChannel delegate;
    private final Runnable closeTransport;
    private volatile boolean closed;
    private long deadline;
    private int remaining;

    BoundedCardChannel(CardChannel delegate, Runnable closeTransport) {
        this.delegate = delegate;
        this.closeTransport = closeTransport;
    }

    void begin() {
        if (closed) throw new IllegalStateException("Connect the Satochip again before signing.");
        deadline = System.nanoTime() + 20_000_000_000L;
        remaining = 48;
    }

    @Override
    public APDUResponse send(APDUCommand command) throws IOException {
        if (closed || --remaining < 0 || System.nanoTime() > deadline) {
            close();
            throw new IOException("The Satochip operation expired; reconnect to continue.");
        }
        APDUResponse response = delegate.send(command);
        if (response.getData().length > 4096) {
            close();
            throw new IOException("The card response exceeded the allowed size.");
        }
        return response;
    }

    @Override
    public boolean isConnected() {
        return !closed && delegate.isConnected();
    }

    @Override
    public void close() {
        if (!closed) {
            closed = true;
            closeTransport.run();
        }
    }
}
