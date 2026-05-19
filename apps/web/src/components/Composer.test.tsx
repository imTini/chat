import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "./Composer.js";

const MOCK_DATA_URL = "data:image/png;base64,ABC123";

function makeFileReaderMock(dataUrl = MOCK_DATA_URL) {
  vi.stubGlobal(
    "FileReader",
    class {
      onload: ((e: { target: { result: string } }) => void) | null = null;
      readAsDataURL(_file: File) {
        this.onload?.({ target: { result: dataUrl } });
      }
    }
  );
}

afterEach(() => vi.unstubAllGlobals());

function setup(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(
    <Composer
      onSend={onSend}
      onStop={onStop}
      generating={false}
      disabled={false}
      hasVision={true}
      {...props}
    />
  );
  return { onSend, onStop };
}

function getFileInput() {
  return document.querySelector<HTMLInputElement>('input[type="file"]')!;
}

function attachImage(file = new File(["img"], "test.png", { type: "image/png" })) {
  fireEvent.change(getFileInput(), { target: { files: [file] } });
}

describe("Composer – file attachment", () => {
  it("shows attach button when hasVision is true", () => {
    setup({ hasVision: true });
    expect(screen.getByTitle("Attach image")).toBeInTheDocument();
  });

  it("hides attach button when hasVision is false", () => {
    setup({ hasVision: false });
    expect(screen.queryByTitle("Attach image")).not.toBeInTheDocument();
  });

  it("attach button is disabled while generating", () => {
    setup({ generating: true });
    expect(screen.getByTitle("Attach image")).toBeDisabled();
  });

  it("attach button is disabled when composer is disabled", () => {
    setup({ disabled: true });
    expect(screen.getByTitle("Attach image")).toBeDisabled();
  });

  it("reads image file and shows preview on file input change", async () => {
    makeFileReaderMock();
    setup();
    attachImage();

    await waitFor(() => {
      const preview = screen.getByAltText("attached");
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute("src", MOCK_DATA_URL);
    });
  });

  it("sends text and attached image on submit", async () => {
    makeFileReaderMock();
    const { onSend } = setup();
    const user = userEvent.setup();

    attachImage();
    await waitFor(() => expect(screen.getByAltText("attached")).toBeInTheDocument());
    await user.type(screen.getByRole("textbox"), "What is in this image?");
    await user.click(screen.getByText("Send"));

    expect(onSend).toHaveBeenCalledWith("What is in this image?", MOCK_DATA_URL);
  });

  it("can send image-only message (no text)", async () => {
    makeFileReaderMock();
    const { onSend } = setup();
    const user = userEvent.setup();

    attachImage();
    await waitFor(() => expect(screen.getByAltText("attached")).toBeInTheDocument());
    await user.click(screen.getByText("Send"));

    expect(onSend).toHaveBeenCalledWith("", MOCK_DATA_URL);
  });

  it("clears attached image after send", async () => {
    makeFileReaderMock();
    const user = userEvent.setup();
    setup();

    attachImage();
    await waitFor(() => expect(screen.getByAltText("attached")).toBeInTheDocument());
    await user.click(screen.getByText("Send"));

    await waitFor(() => expect(screen.queryByAltText("attached")).not.toBeInTheDocument());
  });

  it("remove button clears the attached image", async () => {
    makeFileReaderMock();
    const user = userEvent.setup();
    setup();

    attachImage();
    await waitFor(() => expect(screen.getByAltText("attached")).toBeInTheDocument());
    await user.click(screen.getByTitle("Remove image"));

    expect(screen.queryByAltText("attached")).not.toBeInTheDocument();
  });

  it("non-image files are ignored by file input handler", () => {
    const readAsDataURL = vi.fn();
    vi.stubGlobal("FileReader", class { readAsDataURL = readAsDataURL; });
    setup();

    attachImage(new File(["text"], "doc.pdf", { type: "application/pdf" }));

    expect(readAsDataURL).not.toHaveBeenCalled();
    expect(screen.queryByAltText("attached")).not.toBeInTheDocument();
  });

  it("clears preview when model loses vision capability", async () => {
    makeFileReaderMock();
    const { rerender } = render(
      <Composer onSend={vi.fn()} onStop={vi.fn()} generating={false} disabled={false} hasVision={true} />
    );
    attachImage();
    await waitFor(() => expect(screen.getByAltText("attached")).toBeInTheDocument());

    rerender(
      <Composer onSend={vi.fn()} onStop={vi.fn()} generating={false} disabled={false} hasVision={false} />
    );

    expect(screen.queryByAltText("attached")).not.toBeInTheDocument();
  });
});

describe("Composer – send/stop", () => {
  it("calls onSend with trimmed text on Enter", async () => {
    const { onSend } = setup();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "hello");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello", undefined);
  });

  it("does not send on Shift+Enter", async () => {
    const { onSend } = setup();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("send button is disabled when text is empty and no image attached", () => {
    setup();
    expect(screen.getByText("Send")).toBeDisabled();
  });

  it("shows Stop button while generating", () => {
    setup({ generating: true });
    expect(screen.getByText("Stop")).toBeInTheDocument();
    expect(screen.queryByText("Send")).not.toBeInTheDocument();
  });

  it("calls onStop when Stop is clicked", async () => {
    const { onStop } = setup({ generating: true });
    const user = userEvent.setup();
    await user.click(screen.getByText("Stop"));
    expect(onStop).toHaveBeenCalled();
  });
});
