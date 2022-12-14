NES gravity toy project
=======================

.. raw:: html

   <p align="center">
      <img src="https://i.imgur.com/Uk4QjIf.gif" />
   </p>

This is a simple toy project with gravity simulation in 6502 assembly for the NES.

It comes with the assembly code and a NES compiled ROM.

It also includes an `editor for files in CHR format written in JavaScript <#chr-editor>`_:

.. raw:: html

   <p align="center">
      <img src="https://i.imgur.com/tLUDLM4.gif" />
   </p>


You can `use this editor on GitHub Pages <https://sager611.github.io/nes-gravity>`_.

Run
---

Download the `mesen <https://mesen.ca/>`_ emulator (arch/manjaro linux):

.. code::

   sudo pacman -Sy mesen

Run the ``.nes`` file with it:

.. code:: shell

   mesen gravity.nes

Building the source
-------------------

Since the NES uses a 6502 processor, you will need the following to compile the code:

- `asm6 <https://github.com/parasyte/asm6>`_.

To build the assembly simply run the following in a terminal:

.. code:: shell

    asm6f gravity.asm gravity.nes

CHR Editor
----------

In the `chreditor-js/ <chreditor-js/>`_ folder you can find ``chreditor.html``. Double-click or open it in a web browser and you should see a simple editor for CHR files.

You can `use this editor on GitHub Pages <https://sager611.github.io/nes-gravity>`_.
