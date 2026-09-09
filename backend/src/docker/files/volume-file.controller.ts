import { Controller } from "@nestjs/common";
import { FileController } from "./file.controller";
import { VolumeFileService } from "./volume-file.service";

@Controller("api/volumes/:id")
export class VolumeFileController extends FileController {
	constructor(protected readonly files: VolumeFileService) {
		super();
	}
}
