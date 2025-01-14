import { Bubble, Image, ScrollView, List, ListItem, Avatar, FileCard, Video } from '@chatui/core';
import { faStar, faDownload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { includes, map, find, filter, omit } from 'lodash';
import moment from 'moment';
import React, {
	FC,
	ReactElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState
} from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { AppContext } from '../../../utils/app-context';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from './Comps.module.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import botImage from '../../../assets/images/bot_icon_2.png';

export const RenderComp: FC<any> = ({ currentUser, msg, chatUIMsg, onSend }) => {
	const context = useContext(AppContext);

	const [isInLocal, setIsInLocal] = useState(false);
	const [msgToStarred, setMsgToStarred] = useState<{
		botUuid?: string;
		messageId?: string;
	}>({});
	const [starredFromLocal] = useLocalStorage('starredChats', null, true);

	useEffect(() => {
		if (starredFromLocal) {
			if (Object.keys(starredFromLocal)?.includes(msg?.content?.data?.botUuid)) {
				const starred = find(starredFromLocal?.[msg?.content?.data?.botUuid], {
					messageId: msg?.content?.data?.messageId
				});

				if (starred) {
					// console.log("qwe1:", "yes I exist")
					setMsgToStarred(msg?.content?.data);
					setIsInLocal(true);
				}
			}
		}
	}, [msg?.content?.data, starredFromLocal]);

	const isStarred = useMemo(
		() =>
			Object.keys(msgToStarred)?.length > 0
				? !!chatUIMsg?.find(
						(item: any) => item?.content?.data?.botUuid === msgToStarred?.botUuid
				  ) && isInLocal
				: false,
		[msgToStarred, chatUIMsg, isInLocal]
	);

	const onLongPress = useCallback(
		(content: any) => {
			console.log('qwe12:', { content });
			if (msgToStarred?.botUuid) {
				// console.log("nnnn longpress is triggered", { content, msgToStarred });
				// console.log("context", context)
				const prevStarredMsgs = { ...context?.starredMsgs };
				const newStarredMsgs = {
					...prevStarredMsgs,
					[msgToStarred?.botUuid]: filter(
						prevStarredMsgs?.[msgToStarred?.botUuid],
						(item) => item?.messageId !== msgToStarred?.messageId
					)
				};
				// console.log("1234:", { newStarredMsgs, msgToStarred, prev: prevStarredMsgs?.[msgToStarred?.botUuid] })
				if (newStarredMsgs[msgToStarred?.botUuid]?.length === 0) {
					const t = omit(newStarredMsgs, [msgToStarred?.botUuid]);
					context?.setStarredMsgs(t);
					localStorage.setItem('starredChats', JSON.stringify(t));
					try {
						window && window?.androidInteract?.onMsgSaveUpdate(JSON.stringify(t));
						window && window?.androidInteract?.onEvent('nl-chatbotscreen-starmessage', JSON.stringify({ starred: false, botid: msgToStarred?.botUuid, messageid: msgToStarred?.messageId, timestamp: moment().valueOf() }));
						window && window?.androidInteract?.log('nl-chatbotscreen-starmessage event:', JSON.stringify({ starred: false, botid: msgToStarred?.botUuid, messageid: msgToStarred?.messageId, timestamp: moment().valueOf() }));
						window && window?.androidInteract?.log(`new starred : ${JSON.stringify(t)}`);
					} catch (err) {
						window &&
							window?.androidInteract?.log(
								`error in onMsgSaveUpdate func:${JSON.stringify(err)}`
							);
					}
				} else {
					context?.setStarredMsgs(newStarredMsgs);
					localStorage.setItem('starredChats', JSON.stringify(newStarredMsgs));
					try {
						window && window?.androidInteract?.onMsgSaveUpdate(JSON.stringify(newStarredMsgs));
						window && window?.androidInteract?.onEvent('nl-chatbotscreen-starmessage', JSON.stringify({ starred: true, botid: msgToStarred?.botUuid, messageid: msgToStarred?.messageId, timestamp: moment().valueOf() }));
						window && window?.androidInteract?.log('nl-chatbotscreen-starmessage event:', JSON.stringify({ starred: true, botid: msgToStarred?.botUuid, messageid: msgToStarred?.messageId, timestamp: moment().valueOf() }));
						window && window?.androidInteract?.log(`new starred : ${JSON.stringify(newStarredMsgs)}`);
					} catch (err) {
						window && window?.androidInteract?.log(`error in onMsgSaveUpdate func:${JSON.stringify(err)}`);
					}
				}
				setMsgToStarred({});
				setIsInLocal(false);
				// try {
				//   window &&
				//     window?.androidInteract?.onMsgSaveUpdate(
				//       content,
				//       msg?.messageId,
				//       currentUser?.id,
				//       false
				//     );
				//   window && window?.androidInteract?.log(`${JSON.stringify(content)}`);
				// } catch (err) {
				//   window &&
				//     window?.androidInteract?.log(
				//       `error in onMsgSaveUpdate func:${JSON.stringify(err)}`
				//     );
				// }
			} else {
				setMsgToStarred(content?.data);
				setIsInLocal(true);
				context?.setStarredMsgs((prev: any) => {
					let valueToReturn = {};
					if (includes(Object.keys(prev), content?.data?.botUuid)) {
						valueToReturn = {
							...prev,
							// eslint-disable-next-line no-unsafe-optional-chaining
							[content?.data?.botUuid]: [...prev?.[content?.data?.botUuid], { ...content?.data }]
						};
					} else
						valueToReturn = {
							...prev,
							[content?.data?.botUuid]: [content?.data]
						};

					localStorage.setItem('starredChats', JSON.stringify(valueToReturn));
					try {
						window && window?.androidInteract?.onMsgSaveUpdate(JSON.stringify(valueToReturn));
						window && window?.androidInteract?.log(`new starred : ${JSON.stringify(valueToReturn)}`);
					} catch (err) {
						window && window?.androidInteract?.log( `error in onMsgSaveUpdate func:${JSON.stringify(err)}`);
					}
					return valueToReturn;
				});
				
			}
		},
		[context, msgToStarred]
	);

	const handleSend = useCallback(
		(type: string, val: any) => {
			if (type === 'text' && val.trim()) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				onSend(val, null, true, currentUser);
			}
		},
		[onSend, currentUser]
	);

	const getLists = useCallback(
		({ choices, isDisabled }: { choices: any; isDisabled: boolean }) => {
			console.log('qwer12:', { choices, isDisabled });
			return (
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				<List className={`${styles.list}`}>
					{map(choices ?? [], (choice, index) => (
						<ListItem
							key={`${index}_${choice?.key}`}
							className={`${styles.onHover} ${styles.listItem}`}
							onClick={(e): void => {
								e.preventDefault();
								console.log('qwer12 trig', { key: choice.key, isDisabled });
								if (isDisabled) {
									toast.error('Cannot answer again');
								} else {
									handleSend('text', choice.key);
								}
							}}
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-ignore
							// eslint-disable-next-line react/no-children-prop
							children={
								<div>
									<span className="onHover">
										{choice.key} {choice.text}
									</span>
								</div>
							}
						/>
					))}
				</List>
			);
		},
		[handleSend]
	);

	const download = (url: string): void => {
		try {
			window && window?.androidInteract?.onImageDownload(url);
			console.log('onImageDownload function executed');
		} catch (err) {
			console.log('onImageDownload function failed');
			window &&
				window?.androidInteract?.log(`error in onImageDownload: ${JSON.stringify(err)}`);
		}
	};


	const onVideoDownload=(url:string):void=>{
		window && window?.androidInteract?.onVideoDownload(url);
	};
	const onPdfDownload=(url:string):void=>{
		window && window?.androidInteract?.onPdfDownload(url);
	};
	const { content, type } = msg;
	console.log('qwsd:', { content, type });
	switch (type) {
		case 'text':
			return (
				<>
					{content?.data?.position === 'left' && (
						<div style={{ width: '40px', marginRight: '4px', textAlign: 'center' }}>
							<Avatar src={botImage} size="md" />
						</div>
					)}
					<Bubble type="text">
						<span className="onHover" style={{ fontSize: '16px' }}>
							{content.text}
						</span>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'self-end'
							}}
						>
							<span style={{ color: 'var(--grey)', fontSize: '10px' }}>
								{moment
									.utc(content?.data?.sentTimestamp || content?.data?.repliedTimestamp)
									.local()
									.format('DD/MM/YYYY : hh:mm')}
							</span>
							<span>
								{content?.data?.position === 'left' && (
									<FontAwesomeIcon
										icon={faStar}
										onClick={(): void => onLongPress(content)}
										color={isStarred ? 'var(--primaryyellow)' : 'var(--grey)'}
									/>
								)}
							</span>
						</div>
					</Bubble>
				</>
			);

		case 'image': {
			console.log('alibaba:', { msg });
			const url = content?.data?.payload?.media?.url || content?.data?.imageUrl;
			return (
				<>
					{content?.data?.position === 'left' && (
						<div style={{ width: '40px', marginRight: '4px', textAlign: 'center' }}>
							<Avatar src={botImage} size="md" />
						</div>
					)}
					<Bubble type="image">
						<div style={{ padding: '7px' }}>
							<Image src={url} width="299" height="200" alt="image" lazy fluid />

							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'self-end'
								}}
							>
								<span style={{ color: 'var(--grey)', fontSize: '10px' }}>
									{moment
										.utc(content?.data?.sentTimestamp || content?.data?.repliedTimestamp)
										.local()
										.format('DD/MM/YYYY : hh:mm')}
								</span>
								<span>
									{content?.data?.position === 'left' && (
										<FontAwesomeIcon
											icon={faStar}
											onClick={(): void => onLongPress(content)}
											color={isStarred ? 'var(--primaryyellow)' : 'var(--grey)'}
										/>
									)}
									<FontAwesomeIcon
										icon={faDownload}
										onClick={(): void => download(url)}
										style={{ marginLeft: '10px' }}
										color={'var(--grey)'}
									/>
								</span>
							</div>
						</div>
					</Bubble>
				</>
			);
		}

		case 'file': {
			const url = content?.data?.payload?.media?.url || content?.data?.fileUrl;
			return (
				<>
					{content?.data?.position === 'left' && (
						<div style={{ width: '40px', marginRight: '4px', textAlign: 'center' }}>
							<Avatar src={botImage} size="md" />
						</div>
					)}
					<Bubble type="image">
						<div style={{ padding: '7px' }}>
							{/* <Image src={url} width="299" height="200" alt="image" lazy fluid /> */}
							<FileCard file={url} extension="pdf" />
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'self-end'
								}}
							>
								<span style={{ color: 'var(--grey)', fontSize: '10px' }}>
									{moment
										.utc(content?.data?.sentTimestamp || content?.data?.repliedTimestamp)
										.local()
										.format('DD/MM/YYYY : hh:mm')}
								</span>
								<span>
									{content?.data?.position === 'left' && (
										<FontAwesomeIcon
											icon={faStar}
											onClick={(): void => onLongPress(content)}
											color={isStarred ? 'var(--primaryyellow)' : 'var(--grey)'}
										/>
									)}
									<FontAwesomeIcon
										icon={faDownload}
										onClick={(): void => onPdfDownload(url)}
										style={{ marginLeft: '10px' }}
										color={'var(--grey)'}
									/>
								</span>
							</div>
						</div>
					</Bubble>
				</>
			);
		}

		case 'video': {
			const url = content?.data?.payload?.media?.url || content?.data?.videoUrl;
			return (
				<>
					{content?.data?.position === 'left' && (
						<div style={{ width: '40px', marginRight: '4px', textAlign: 'center' }}>
							<Avatar src={botImage} size="md" />
						</div>
					)}
					<Bubble type="image">
						<div style={{ padding: '7px' }}>
							<Video
								cover="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPcAAADMCAMAAACY78UPAAAAeFBMVEUyMjL///8vLy/Q0NBJSUlAQEA8Oz85OD0tLS0qKio1Nzs5OTz6+vo5OTnZ2dkzMzPw8PBkZGRGRkaAgIDo6OioqKgkJCR6enqurq5SUlLMzMyFhYXh4eHW1ta7u7tHR0dcXFybm5twcHC/v7+UlJRXWFeVlZVsbGwZSzceAAAD0UlEQVR4nO3ca3OiMBiGYYOoPUQNihVBrQfc/v9/uEntslRBwmFk3jfPNbOf2tlyT0oCgTp4m0wm75Mb46tRkfH40Vf/f7nczQ97L/aW0d8xLfxJ1+N+n4wnFcejvzH//+l/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgOfw+j6AfswXcxfLvcUqnb70fRTP5/lDebx8ODfkuluI3Xrg2pB/dwu137y4NeTXbjPkI6eG/F+3CKPPj74P5omybiGGiefO73quW6jo8Nr38TxLvlvI3dJz5Cz/1a2H/Oi7sZbfdAsxWzpx+XbXrSd2F9by+24h4yX/ib2g20zs01fm5YXdQsQJ87O8pFuo1YH15VtZt17LT6+Mh7y02ww544n9Qbdey08jruEPu8U2+mK6pD3uFnK2HLC8V6no1uX7A8et5spuIXapz2/ILbr15duG3Vlu0y3kMJkzG3KrbnOWB7zOcstuPbEnrNZy225zXx4w2oqx79aXb4z22Ot0C7UPuDw8rdWtJ/Z0xGNir9fN5yatbrc+y9Mpg/D63fryjcFZ3qBbyF1CfmJv0m3WcuqPVZp165u0ZEF6yJt267Wc9H15425zkzalu5Y37zZr+YXsWt6mW4htQnUtb9ctwlVAcyumZbdey9dzihN7225z+XYhOOTtu82LUAtyE3sX3WbDldpa3km3eUWC2GOVbrq/330jdZZ31W2epC3mfdfY66xbX8Ss3ezebwj9onfWHdPaZO6oOzwHtN786qY7PC36Dqmpi24VnWgN9qCLbrlNPFrXLEbrbhldKN6Dt+0eHmm+BNKuW54X5M7sq1bdwyXNwR606g7PJ7Lbii26VTLt++BbaNqtjgHdwR407ZbbP4SfGRjNuvcHimt2XpPuYeqT/h036nereEP8GbBRu3u2pLS9UKpmtzqfSG0flqrXHSb032y5qtMtjwH1aTxj3y1nK+Jrdp5995n8mp1n222e/THKtuxWMad3sA2r7nDp932cXbPoVvs1+cvSO9V/PxamBLdLK1V1y4jPmp1X0b1b+aym8czj7pjfH8z9eNS9S8hul1Yq71aUt0srlXarZETo9YXaSrpVxOQ+u0xhtwyPjG69ChV273mu2XkF3bPjhueanXfXLYfU/2TGym33LNlQei2psd/dKl478oF7v7pVSvkRZy25brn6Yj+NZ7JuuY24r9l5Wfc5YPX5DVV+umepA2t23ne3ir9cWLPzTHeYbPo+jKfz/HPszIfk5nifJ24fQWRn6s6aDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbPwFoto0lZUp3cEAAAAASUVORK5CYII="
								src={url}
							/>

							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'self-end'
								}}
							>
								<span style={{ color: 'var(--grey)', fontSize: '10px' }}>
									{moment
										.utc(content?.data?.sentTimestamp || content?.data?.repliedTimestamp)
										.local()
										.format('DD/MM/YYYY : hh:mm')}
								</span>
								<span>
									{content?.data?.position === 'left' && (
										<FontAwesomeIcon
											icon={faStar}
											onClick={(): void => onLongPress(content)}
											color={isStarred ? 'var(--primaryyellow)' : 'var(--grey)'}
										/>
									)}
									<FontAwesomeIcon
										icon={faDownload}
										onClick={(): void => onVideoDownload(url)}
										style={{ marginLeft: '10px' }}
										color={'var(--grey)'}
									/>
								</span>
							</div>
						</div>
					</Bubble>
				</>
			);
		}
		case 'options': {
			console.log('qwe12:', { content });
			return (
				<>
					<div style={{ width: '95px', marginRight: '4px', textAlign: 'center' }}>
						<Avatar src={botImage} size="md" />
					</div>
					<Bubble type="text">
						<div style={{ display: 'flex' }}>
							<span style={{ fontSize: '16px' }}>{content.text}</span>
						</div>
						<div style={{ marginTop: '10px' }} />
						{getLists({
							choices: content?.data?.payload?.buttonChoices ?? content?.data?.choices,
							isDisabled: content?.data?.disabled
						})}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'self-end'
							}}
						>
							<span style={{ color: 'var(--grey)', fontSize: '10px' }}>
								{moment
									.utc(content?.data?.sentTimestamp || content?.data?.repliedTimestamp)
									.local()
									.format('DD/MM/YYYY : hh:mm')}
							</span>
							<span>
								{content?.data?.position === 'left' && (
									<FontAwesomeIcon
										icon={faStar}
										onClick={(): void => onLongPress(content)}
										color={isStarred ? 'var(--primaryyellow)' : 'var(--grey)'}
									/>
								)}
							</span>
						</div>
					</Bubble>
				</>
			);
		}
		default:
			return (
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				<ScrollView data={[]} renderItem={(item): ReactElement => <Button label={item.text} />} />
			);
	}
};
