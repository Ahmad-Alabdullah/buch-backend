/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Das Modul besteht aus der Klasse {@linkcode BuchReadService}.
 * @packageDocumentation
 */

import { Buch, type BuchArt } from './../entity/buch.entity.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder } from './query-builder.js';
import RE2 from 're2';
import { getLogger } from '../../logger/logger.js';
import * as fs from 'fs/promises';
//import * as path from 'path';

/**
 * Typdefinition für `findById`
 */
export interface FindByIdParams {
    /** ID des gesuchten Buchs */
    readonly id: number;
    /** Sollen die Abbildungen mitgeladen werden? */
    readonly mitAbbildungen?: boolean;
}
export interface Suchkriterien {
    readonly isbn?: string;
    readonly rating?: number;
    readonly art?: BuchArt;
    readonly preis?: number;
    readonly rabatt?: number;
    readonly lieferbar?: boolean;
    readonly datum?: string;
    readonly homepage?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly titel?: string;
}



/**
 * Die Klasse `BuchReadService` implementiert das Lesen für Bücher und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class BuchReadService {
    static readonly ID_PATTERN = new RE2('^[1-9][\\d]*$');

    readonly #buchProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(BuchReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const buchDummy = new Buch();
        this.#buchProps = Object.getOwnPropertyNames(buchDummy);
        this.#queryBuilder = queryBuilder;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Buch asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Buches
     * @returns Das gefundene Buch vom Typ [Buch](buch_entity_buch_entity.Buch.html)
     *          in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Buch mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id, mitAbbildungen = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const buch = await this.#queryBuilder
            .buildId({ id, mitAbbildungen })
            .getOne();
        if (buch === null) {
            throw new NotFoundException(`Es gibt kein Buch mit der ID ${id}.`);
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: buch=%s, titel=%o',
                buch.toString(),
                buch.titel,
            );
            if (mitAbbildungen) {
                this.#logger.debug(
                    'findById: abbildungen=%o',
                    buch.abbildungen,
                );
            }
        }
        return buch;
    }

    /**
     * Bücher asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Büchern.
     * @throws NotFoundException falls keine Bücher gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const buecher = await this.#queryBuilder.build(suchkriterien).getMany();
        this.#logger.debug('find: buecher=%o', buecher);
        if (buecher.length === 0) {
            throw new NotFoundException(
                `Keine Buecher gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }

        return buecher;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Buch oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#buchProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript'
            ) {
                this.#logger.debug(
                    '#find: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }

   /**
   * Find a book's image by its name.
   * @param imageName The name of the book's image.
   * @returns The book's image as a Buffer.
   * @throws NotFoundException if the image is not found.
   */
    async findImageByName(imageName: string): Promise<Buffer> {
        this.#logger.debug('findImageByName: imageName=%s', imageName);

        // Implement your logic to load the image from the backend.
        // This can include reading the image file from the server.

        // For demonstration purposes, let's assume there's a function called loadImageFromServer
        // that reads the image file and returns it as a Buffer.
        const imageBuffer = await this.loadImageFromServer(imageName);

        if (!imageBuffer) {
            throw new NotFoundException(`No image found for name: ${imageName}`);
        }

        return imageBuffer;
    }

    /**
     * Load an image from the server.
     * @param imageName The name of the image to load.
     * @returns The image as a Buffer.
     * @throws NotFoundException if the image is not found.
     */
    private async loadImageFromServer(imageName: string): Promise<Buffer> {
        // Replace this with your actual logic to load the image file from the server.
        // You may use file system operations, cloud storage APIs, or any other method.
        // Ensure to handle errors and throw a NotFoundException if the image is not found.

        // For demonstration purposes, we assume a fictional function loadImageFromFileSystem
        // that reads the image file and returns it as a Buffer.
        // You should replace this with your actual implementation.
        const imageBuffer = await this.loadImageFromFileSystem(imageName);

        if (!imageBuffer) {
            throw new NotFoundException(`Image not found for name: ${imageName}`);
        }

        return imageBuffer;
    }

    /**
   * Load an image from the file system.
   * @param imageName The name of the image to load.
   * @returns The image as a Buffer.
   * @throws NotFoundException if the image is not found.
   */
  private async loadImageFromFileSystem(imageName: string): Promise<Buffer> {
    // Replace this with your actual logic to read the image file from the file system.
    // You may use file system APIs or any other method.

    // For demonstration purposes, we assume that the images are stored in a folder named 'images'.
    // Adjust the path based on your actual file structure.
      //const basePath = 'file://' + path.join(process.cwd(), 'images') + '/';
      const imagePath = "C:/Users/Student/SWE/buch/images/" + imageName;



      this.#logger.debug('Constructed Image Path=%s', imagePath);

    // Use the fs.promises module to read the image file and return it as a Buffer.
    // Ensure to handle errors and throw NotFoundException if the image is not found.
    try {
      const imageBuffer = await fs.readFile(imagePath);

      return imageBuffer;
    } catch (error: any) {
      // Handle the error, e.g., log it, and throw NotFoundException
      console.error(`Error loading image: ${error.message}`);
      throw new NotFoundException(`Image not found for name: ${imageName}`);
    }
  }
}
