class InteractiveChatbox {
    constructor(a, b) {
        this.args = {
            button: a,
            chatbox: b
        }
        this.state = false;
        this.showOrHideChatBox(b, a);
    }

    display() {
        const { button, chatbox } = this.args;

        button.addEventListener('click', () => this.toggleState(chatbox))
    }

    toggleState(chatbox) {
        this.state = !this.state;
        this.showOrHideChatBox(chatbox, this.args.button);
    }

    showOrHideChatBox(chatbox, button) {
        if (this.state) {
            chatbox.style.display = 'flex';
            chatbox.classList.add('chatbox--active')
        } else if (!this.state) {
            chatbox.style.display = 'none';
            chatbox.classList.remove('chatbox--active')
        }
    }
}
